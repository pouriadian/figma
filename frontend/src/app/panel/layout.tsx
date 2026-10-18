import type {ReactNode} from 'react';
import type {Metadata} from 'next';
import './panel.css';
import './panel-modern.css';
export const metadata:Metadata={title:'پنل مدیریت فرامید',robots:{index:false,follow:false,nocache:true}};
export default function PanelRoot({children}:{children:ReactNode}){return <div className="fm-panel-root" dir="rtl">{children}</div>}
