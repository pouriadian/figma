export type Paint = { type: string; color?: string; url?: string; opacity?: number; mode?: string; visible?: boolean; stops?: {color:string;position:number}[] };
export type DesignNode = {
  id:string; type:string; name?:string; x:number; y:number; w:number; h:number;
  matrix?:number[]; opacity?:number; radius?:number|string;
  fills?: Paint[]; strokes?: Paint[]; strokeWeight?:number; overflow?:string;
  text?:string; fontSize?:number; fontFamily?:string; fontWeight?:number;
  align?:'left'|'right'|'center'|'justify';vAlign?:string;letterSpacing?:number;lineHeight?:{units?:string,value?:number};rtl?:boolean;
  paths?:{d:string;color?:string;kind:string;winding?:string}[];
  effects?:{type:string;color:string;x:number;y:number;r:number;spread:number}[];
  children?:DesignNode[];
};
