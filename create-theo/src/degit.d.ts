declare module "degit" {
  interface DegitOptions {
    verbose?: boolean;
    cache?: boolean;
    force?: boolean;
    mode?: string;
  }

  interface DegitEmitter {
    on(event: string, callback: (info: { message: string }) => void): void;
    clone(dest: string): Promise<void>;
  }

  function degit(repo: string, options?: DegitOptions): DegitEmitter;
  export default degit;
}
