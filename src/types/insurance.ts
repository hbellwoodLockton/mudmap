export interface Layer {
  id: number;
  insurer: string;
  limit: string;
  attachment: string;
  premium: string;
  share: string;
  layerType: 'quotashare' | 'primary' | 'xol';
  color: string;
  position?: number;  // Add the position property (optional)
}
  
export interface GridDimensions {
  width: number;
  height: number;
}

export interface LayerElement {
  key: string;
  type: 'quotashare' | 'primary' | 'xol';
  height: string;
  width: string;
  bottom: string;
  left: string;
  color: string;
  borderColor: string;
  zIndex?: number;
  insurer: string;
  premium: number;
  share: number;
}