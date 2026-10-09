declare module "troika-three-text" {
  export class Text {
    text: string;
    fontSize: number;
    anchorX: string;
    anchorY: string;
    color: number | string;
    position: { copy: (v: unknown) => void };
    rotation: { y: number };
    userData: Record<string, unknown>;
    sync: () => void;
  }
}
