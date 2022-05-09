type UnsubscribeFunction = () => void;
type SubscribeCallbackFunction = (...args: unknown[]) => void;
type SubscribeFunction = (cb: SubscribeCallbackFunction) => UnsubscribeFunction;
type SetFunction = (value: unknown) => void;

const instances = new Map<string | URL, WSocket>();

export default class WSocket {
  public readonly url: string | URL;
  public readonly protocols?: string | string[];
  private ws: WebSocket;
  private eventsHandlers = new Map<string, Set<SubscribeCallbackFunction>>();

  constructor(url: string | URL, protocols?: string | string[]) {
    if (instances.has(url)) {
      return instances.get(url)!;
    }
    this.url = url;
    this.protocols = protocols;
    this.ws = new WebSocket(this.url, this.protocols);
    instances.set(url, this);
    this.addListeners();
  }

  static get(url: string | URL): WSocket {
    const instance = instances.get(url);
    if (!instance) {
      throw new Error(
        `[WSocket] Instance is found for this url - ${JSON.stringify(url)}`
      );
    }
    return instance;
  }

  get socket() {
    return this.ws;
  }

  public getState() {
    return {
      subscribe: this.$subscribe("$$_changeState"),
    };
  }

  public open(): void {
    if (this.ws.readyState === WebSocket.CLOSED) {
      this.ws = new WebSocket(this.url, this.protocols);
      this.onStateChange();
    }
  }

  public close(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
      this.onStateChange();
    }
  }

  public send(eventName: string, data: unknown): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("[WSocket] Error send message! WebSocket is not opened!");
    }
    this.ws.send(
      JSON.stringify({
        event: eventName,
        data,
      })
    );
  }

  public sendPlainText(text: string): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("[WSocket] Error send message! WebSocket is not opened!");
    }
    this.ws.send(text);
  }

  public on(eventName: string) {
    return {
      set: this.$set(eventName),
      subscribe: this.$subscribe(eventName),
    };
  }

  public emit(eventName: string, ...args: unknown[]): void {
    const callbacks = this.eventsHandlers.get(eventName);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  private addListeners(): void {
    this.ws.addEventListener("open", this.onSocketOpen.bind(this));
    this.ws.addEventListener("close", this.onSocketClose.bind(this));
    this.ws.addEventListener("error", this.onSocketError.bind(this));
    this.ws.addEventListener("message", this.onSocketMessage.bind(this));
  }

  private onSocketOpen(): void {
    this.onStateChange();
    this.emit("open", true);
  }

  private onSocketClose(ev: CloseEvent): void {
    this.onStateChange();
    this.emit("close", ev.code, ev.reason);
  }

  private onSocketError(ev: Event): void {
    this.emit("error", ev);
  }

  private onSocketMessage(ev: MessageEvent): void {
    const stringData = ev.data as string;
    this.emit("message", stringData);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { event, data } = JSON.parse(stringData);
      this.emit(event, data);
    } catch (e) {
      console.warn(`[WSocket] Json parsing failed! Message: ${stringData}`);
    }
  }

  private onStateChange(): void {
    const state = this.ws.readyState;
    this.emit("$$_changeState", state);
  }

  private $set(eventName: string): SetFunction {
    return function (this: WSocket, value: unknown) {
      this.ws.send(
        JSON.stringify({
          event: eventName,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          data: value,
        })
      );
    }.bind(this);
  }

  private $subscribe(eventName: string): SubscribeFunction {
    return function (
      this: WSocket,
      func: SubscribeCallbackFunction
    ): UnsubscribeFunction {
      if (eventName === "$$_changeState") {
        func(this.ws.readyState);
      } else if (
        eventName === "open" &&
        this.ws.readyState === WebSocket.OPEN
      ) {
        func(true);
      }
      if (!this.eventsHandlers.has(eventName)) {
        this.eventsHandlers.set(eventName, new Set());
      }
      this.eventsHandlers.get(eventName)?.add(func);
      return () => {
        const subs = this.eventsHandlers.get(eventName)!;
        subs.delete(func);
        if (subs.size === 0) {
          this.eventsHandlers.delete(eventName);
        }
      };
    }.bind(this);
  }
}
