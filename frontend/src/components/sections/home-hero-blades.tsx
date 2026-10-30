import {useId,type CSSProperties} from 'react';

const bladePaths=[
  'M0 125.789L50.5311 0.0969238V358.974L0.222911 232.786L0 125.789Z',
  'M52.5932 141.045L133.914 0.0969238V358.974L50.9492 207.771L52.5932 141.045Z',
  'M135.154 128.126L215.318 0.0969238V358.974L133.496 230.728L135.154 128.126Z',
  'M215.234 123.827L305.318 0.0969238V358.974L216.056 236.467L215.234 123.827Z',
  'M306.057 99.43L396.057 0.787109V359.665L306.057 261.736Z',
  'M395.221 88.666L472 0V358.877L395.221 277.367V88.666Z',
];
const gradients=[
  {x1:'50.5311',x2:'0',y:'179.536'},
  {x1:'133.761',x2:'66.3301',y:'179.536'},
  {x1:'215.318',x2:'145.241',y:'179.536'},
  {x1:'305.318',x2:'222.242',y:'179.536'},
  {x1:'403.343',x2:'315.851',y:'180.226'},
  {x1:'478.2',x2:'403.706',y:'179.439'},
];
const stops=[['#AFAFAF','.01'],['#A7A7A7','.11'],['#939393','.25'],['#717171','.41'],['#434343','.61'],['#080808','.82'],['#000000','.84'],['#000000','1']];

export function HomeHeroBlades({className=''}:{className?:string}){
  const instanceId=useId().replace(/:/g,'');
  return <svg viewBox="0 0 472 360" fill="none" aria-hidden="true" focusable="false" className={`faromid-hero-blades ${className}`}>
    <defs>{gradients.map((gradient,index)=><linearGradient key={index} id={`${instanceId}-blade-${index}`} x1={gradient.x1} y1={gradient.y} x2={gradient.x2} y2={gradient.y} gradientUnits="userSpaceOnUse">{stops.map(([color,offset])=><stop key={offset} offset={offset} stopColor={color}/>)}</linearGradient>)}</defs>
    <g>{bladePaths.map((path,index)=><g key={index} className="blade" style={{'--index':index} as CSSProperties}>
      <path className="blade-face" d={path} fill={`url(#${instanceId}-blade-${index})`} opacity=".83"/>
      <path className="blade-outline-glow" d={path} pathLength={100} fill="none" stroke="#ff1837" strokeWidth="6" strokeDasharray="17 83" strokeDashoffset="100" strokeLinecap="butt" strokeLinejoin="miter"/>
      <path className="blade-outline" d={path} pathLength={100} fill="none" stroke="#ff3049" strokeWidth="2" strokeDasharray="17 83" strokeDashoffset="100" strokeLinecap="butt" strokeLinejoin="miter"/>
    </g>)}</g>
  </svg>;
}
