export interface FilterSettings {
  brightness: number;     // -100 to 100
  contrast: number;       // -100 to 100
  saturation: number;     // -100 to 100
  sharpness: number;      // 0 to 100
  exposure: number;       // -100 to 100
  temperature: number;    // -100 to 100
  denoise: number;        // 0 to 100
  vignette: number;       // 0 to 100
  dehaze: number;         // 0 to 100
}

export const initialFilterSettings: FilterSettings = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  sharpness: 0,
  exposure: 0,
  temperature: 0,
  denoise: 0,
  vignette: 0,
  dehaze: 0,
};

export interface BackgroundSettings {
  colorKey: string | null;  // Hex or rgb color clicked by user
  tolerance: number;        // 1 to 100
  feather: number;          // 0 to 15
  replacementType: 'transparent' | 'color' | 'gradient' | 'image';
  solidColor: string;       // Hex replacement
  gradientPreset: string;   // Gradient CSS config
  customBgUrl: string | null; // User uploaded bg image URL
}

export const initialBgSettings: BackgroundSettings = {
  colorKey: null,
  tolerance: 30,
  feather: 4,
  replacementType: 'transparent',
  solidColor: '#1e293b',
  gradientPreset: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  customBgUrl: null,
};

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

export interface VideoSettings {
  filter: 'none' | 'mono' | 'sepia' | 'cool' | 'warm' | 'hdr' | 'cinematic';
  speed: number;          // 0.25 to 2.0
  volume: number;         // 0 to 1.0
  isMuted: boolean;
  trimStart: number;      // Seconds
  trimEnd: number;        // Seconds
  textOverlay: string;
  textPositionX: number;  // % from left (0 to 100)
  textPositionY: number;  // % from top (0 to 100)
  textColor: string;
  textSize: number;       // Px size
  enhanceOn: boolean;     // Real-time brightness/contrast booster
}

export const initialVideoSettings: VideoSettings = {
  filter: 'none',
  speed: 1.0,
  volume: 1.0,
  isMuted: false,
  trimStart: 0,
  trimEnd: 0,
  textOverlay: '',
  textPositionX: 50,
  textPositionY: 80,
  textColor: '#ffffff',
  textSize: 24,
  enhanceOn: false,
};
