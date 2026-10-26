import { Chess } from "chess.js";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { Color } from "../types/chess";
import {
  cleanName,
  initialGame,
  isGameState,
  isRoomRecord,
  opposite,
  replayGame,
  roomSnapshot,
  validCode,
  type Command,
  type MoveInput,
  type RoomRecord,
  type RoomSnapshot,
  type RoomState,
} from "./protocol";

const STORAGE_KEY = "gambit:room:v2";
const initial = (): RoomState => ({
  ...initialGame("Người chơi", "w"),
  status: "idle",
  role: null,
  code: "",
  myColor: "w",
  error: null,
  pendingMove: false,
});
class RoomError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export class RoomClient {
  chess = new Chess();
  private state = initial();
  private listeners = new Set<() => void>();
  private client?: SupabaseClient;
  private channel?: RealtimeChannel;
  private unsubscribeAuth?: () => void;
  private userId = "";
  private accessToken = "";
  private url = "";
  private key = "";
  private generation = 0;
  private revision = -1;
  private row?: RoomRecord;
  private clockOffset = 0;
  private interval?: ReturnType<typeof setInterval>;
  private refreshPending = false;
  private heartbeatPending = false;
  private pendingCommand?: string;
  private ticks = 0;
  private entry?: { action: "create" | "join"; input: Record<string, unknown> };
  private credentials?: { code: string; role: "host" | "guest" };
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  private update(patch: Partial<RoomState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  private save() {
    if (this.credentials) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.credentials));
      } catch {
        /* The current page can still play without persistence. */
      }
    }
  }
  private stop() {
    this.generation++;
    clearInterval(this.interval);
    this.pendingCommand = undefined;
    this.unsubscribeAuth?.();
    this.unsubscribeAuth = undefined;
    if (this.channel && this.client)
      void this.client.removeChannel(this.channel).catch(() => {});
    this.channel = undefined;
    this.refreshPending = false;
    this.heartbeatPending = false;
  }
  private markAway() {
    if (!this.credentials || !this.accessToken || !this.url) return;
    void fetch(`${this.url}/rest/v1/rpc/gambit_heartbeat`, {
      method: "POST",
      keepalive: true,
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ p_code: this.credentials.code, p_online: false }),
    }).catch(() => {});
  }
  dispose = () => {
    this.markAway();
    this.stop();
    this.update({ status: "idle" });
  };
  leave = () => {
    this.markAway();
    this.stop();
    this.credentials = undefined;
    this.row = undefined;
    this.revision = -1;
    this.entry = undefined;
    this.chess = new Chess();
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing to remove. */
    }
    this.state = initial();
    this.listeners.forEach((listener) => listener());
  };
  restore = (inviteCode?: string) => {
    if (this.state.status !== "idle") return;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null");
      if (
        !saved ||
        !validCode(saved.code) ||
        !["host", "guest"].includes(saved.role) ||
        (inviteCode && inviteCode !== saved.code)
      )
        return;
      this.credentials = saved;
      this.update({
        code: saved.code,
        role: saved.role,
        status: "reconnecting",
      });
      void this.connect("restore");
    } catch {
      /* Invalid local state is ignored; server membership remains authoritative. */
    }
  };
  create = (name: string, color: Color) => {
    this.leave();
    this.update({
      role: "host",
      status: "opening",
      hostName: cleanName(name),
      hostColor: color,
      myColor: color,
    });
    this.entry = { action: "create", input: { name: cleanName(name), color } };
    void this.connect(this.entry.action, this.entry.input);
  };
  join = (code: string, name: string) => {
    if (!validCode(code)) {
      this.update({ error: "Mã phòng gồm 6 ký tự. Bạn kiểm tra lại nhé." });
      return;
    }
    this.leave();
    this.credentials = { code, role: "guest" };
    this.update({ code, role: "guest", status: "opening" });
    this.entry = { action: "join", input: { code, name: cleanName(name) } };
    void this.connect(this.entry.action, this.entry.input);
  };
  retry = () => {
    if (this.credentials && this.revision >= 0) void this.connect("restore");
    else if (this.entry) void this.connect(this.entry.action, this.entry.input);
  };
  private async auth(generation: number) {
    const module = await import("../lib/supabase");
    this.client = module.supabase;
    this.url = module.supabaseUrl!;
    this.key = module.supabaseKey!;
    const { data, error } = await this.client.auth.getSession();
    if (error) throw error;
    let session = data.session;
    if (!session) {
      const signed = await this.client.auth.signInAnonymously();
      if (signed.error) {
        if (signed.error.code === "anonymous_provider_disabled")
          throw new RoomError(
            "anonymous_disabled",
            "Phòng chơi chưa bật chế độ khách. Chủ website cần bật Anonymous Sign-ins.",
          );
        if (signed.error.status === 429)
          throw new RoomError(
            "rate_limit",
            "Bạn đã mở nhiều phiên chơi. Chờ một chút rồi thử lại nhé.",
          );
        throw signed.error;
      }
      session = signed.data.session;
    }
    if (!session) throw new Error("No session");
    if (generation !== this.generation) throw new Error("Operation cancelled");
    this.userId = session.user.id;
    this.accessToken = session.access_token;
    const { data: subscription } = this.client.auth.onAuthStateChange(
      (_event, next) => {
        this.accessToken = next?.access_token ?? "";
      },
    );
    this.unsubscribeAuth = () => subscription.subscription.unsubscribe();
  }
  private async request(action: Record<string, unknown>) {
    const { data } = await this.client!.auth.getSession();
    if (!data.session)
      throw new RoomError(
        "not_authenticated",
        "Phiên chơi đã hết hạn. Bạn kết nối lại nhé.",
      );
    this.accessToken = data.session.access_token;
    const response = await fetch(`${this.url}/functions/v1/chess-rooms`, {
      method: "POST",
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(action),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok)
      throw new RoomError(
        body?.error?.code ?? "server_error",
        body?.error?.message ?? "Máy chủ phòng chưa sẵn sàng. Bạn thử lại nhé.",
      );
    const snapshot = body?.room as RoomSnapshot | undefined;
    if (
      !snapshot ||
      !validCode(snapshot.code) ||
      !isGameState(snapshot.game) ||
      !Number.isInteger(snapshot.revision) ||
      !["host", "guest"].includes(snapshot.role) ||
      typeof snapshot.hostPresent !== "boolean" ||
      typeof snapshot.guestPresent !== "boolean"
    )
      throw new Error("Invalid room snapshot");
    return snapshot;
  }
  private apply(snapshot: RoomSnapshot, acknowledged = false) {
    if (
      snapshot.revision < this.revision ||
      (this.credentials && this.credentials.code !== snapshot.code)
    )
      return;
    const changed = snapshot.revision !== this.revision;
    if (changed) {
      this.chess = replayGame(snapshot.game);
      this.revision = snapshot.revision;
    }
    const myColor =
      snapshot.role === "host"
        ? snapshot.game.hostColor
        : opposite(snapshot.game.hostColor);
    const hasGuest =
      snapshot.game.guestName !== "Bạn chơi" || this.row?.guest_uid != null;
    const status =
      snapshot.hostPresent && snapshot.guestPresent
        ? "connected"
        : snapshot.role === "host" && !hasGuest
          ? "waiting"
          : "reconnecting";
    this.credentials = { code: snapshot.code, role: snapshot.role };
    this.update({
      ...(changed ? snapshot.game : {}),
      code: snapshot.code,
      role: snapshot.role,
      myColor,
      status,
      error: null,
      pendingMove: changed || acknowledged ? false : this.state.pendingMove,
    });
    this.save();
  }
  private applyRow(raw: unknown) {
    if (!isRoomRecord(raw)) throw new Error("Invalid server row");
    if (this.credentials && raw.code !== this.credentials.code) return;
    if (raw.revision < this.revision) return;
    const row = { ...raw };
    const previous = this.row;
    // A delayed Realtime event or HTTP read must not undo a newer heartbeat.
    if (previous?.code === row.code) {
      if (
        previous.host_uid === row.host_uid &&
        Date.parse(previous.host_seen) > Date.parse(row.host_seen)
      ) {
        row.host_seen = previous.host_seen;
        row.host_left = previous.host_left;
      }
      if (
        previous.guest_uid === row.guest_uid &&
        Date.parse(previous.guest_seen ?? "") > Date.parse(row.guest_seen ?? "")
      ) {
        row.guest_seen = previous.guest_seen;
        row.guest_left = previous.guest_left;
      }
    }
    this.row = row;
    this.apply(roomSnapshot(row, this.userId, Date.now() + this.clockOffset));
  }
  private async touch(online = true) {
    if (!this.client || !this.credentials || this.heartbeatPending) return;
    this.heartbeatPending = true;
    const generation = this.generation;
    try {
      const { data, error } = await this.client.rpc("gambit_heartbeat", {
        p_code: this.credentials.code,
        p_online: online,
      });
      if (error) throw error;
      if (generation !== this.generation) return;
      if (isRoomRecord(data)) {
        const selfSeen =
          this.userId === data.host_uid ? data.host_seen : data.guest_seen;
        if (selfSeen) this.clockOffset = Date.parse(selfSeen) - Date.now();
      }
      this.applyRow(data);
    } finally {
      if (generation === this.generation) this.heartbeatPending = false;
    }
  }
  private async refresh() {
    if (!this.client || !this.credentials || this.refreshPending) return;
    this.refreshPending = true;
    const generation = this.generation;
    try {
      const { data, error } = await this.client
        .from("gambit_rooms")
        .select("*")
        .eq("code", this.credentials.code)
        .maybeSingle();
      if (error) throw error;
      if (generation !== this.generation) return;
      if (!data)
        throw new RoomError(
          "room_not_found",
          "Phòng không còn tồn tại hoặc phiên này không có quyền vào phòng.",
        );
      this.applyRow(data);
    } finally {
      if (generation === this.generation) this.refreshPending = false;
    }
  }
  private async connect(
    action: "create" | "join" | "restore",
    input: Record<string, unknown> = {},
  ) {
    this.stop();
    const generation = this.generation;
    this.update({
      status: action === "restore" ? "reconnecting" : "opening",
      pendingMove: false,
      error: null,
    });
    try {
      await this.auth(generation);
      if (generation !== this.generation) return;
      if (action === "restore") await this.touch();
      else {
        const snapshot = await this.request({ action, ...input });
        if (generation !== this.generation) return;
        this.apply(snapshot);
      }
      if (generation !== this.generation || !this.credentials) return;
      const code = this.credentials.code;
      this.channel = this.client!.channel(
        `gambit-room-${code}-${crypto.randomUUID()}`,
      )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "gambit_rooms",
            filter: `code=eq.${code}`,
          },
          (payload) => {
            if (generation === this.generation) {
              try {
                this.applyRow(payload.new);
              } catch {
                this.update({
                  status: "error",
                  error: "Bàn cờ chưa đồng bộ được. Bạn kết nối lại nhé.",
                });
              }
            }
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED" && generation === this.generation)
            void this.refresh().catch(() => {});
        });
      this.ticks = 0;
      this.interval = setInterval(() => {
        if (generation !== this.generation) return;
        this.ticks++;
        const work = this.ticks % 4 === 0 ? this.touch() : this.refresh();
        void work.catch((error) => {
          if (generation === this.generation)
            this.update({
              status: "reconnecting",
              pendingMove: false,
              error:
                error instanceof RoomError
                  ? error.message
                  : "Mạng đang gián đoạn. Mình đợi kết nối lại nhé.",
            });
        });
      }, 3000);
    } catch (error) {
      if (generation !== this.generation) return;
      this.stop();
      this.update({
        status: "error",
        pendingMove: false,
        error:
          error instanceof RoomError
            ? error.message
            : error instanceof Error &&
                error.message === "SUPABASE_CONFIG_MISSING"
              ? "Website chưa có cấu hình phòng chơi."
              : "Chưa thể kết nối máy chủ phòng. Kiểm tra mạng rồi thử lại nhé.",
      });
    }
  }
  command = (command: Command) => {
    if (
      this.state.status !== "connected" ||
      this.state.pendingMove ||
      !this.credentials
    )
      return false;
    const generation = this.generation;
    const body = {
      action: "command",
      code: this.credentials.code,
      id: crypto.randomUUID(),
      round: this.state.round,
      ply: this.state.moves.length,
      command,
    };
    this.pendingCommand = body.id;
    this.update({ pendingMove: true, error: null });
    void this.request(body)
      .then((snapshot) => {
        if (generation === this.generation && this.pendingCommand === body.id) {
          this.apply(snapshot, true);
          this.pendingCommand = undefined;
        }
      })
      .catch(async (error) => {
        if (generation !== this.generation || this.pendingCommand !== body.id)
          return;
        try {
          await this.refresh();
        } catch {
          /* Keep the last confirmed board while reconnecting. */
        }
        if (generation === this.generation && this.pendingCommand === body.id)
          this.update({
            pendingMove: false,
            error:
              error instanceof RoomError
                ? error.message
                : "Chưa gửi được nước đi. Bạn kiểm tra mạng rồi thử lại nhé.",
          });
      });
    return true;
  };
  move = (move: MoveInput) => {
    if (
      this.chess.turn() !== this.state.myColor ||
      this.chess.isGameOver() ||
      this.state.resignation
    )
      return false;
    return this.command({ kind: "move", move });
  };
}
