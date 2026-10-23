import {FaromidMark} from './faromid-mark';

export function PageLoader() {
  return <div className="fm-page-loader" role="status" aria-live="polite" aria-label="بارگذاری صفحه">
    <div className="fm-page-loader__content">
      <div className="fm-page-loader__mark-wrap">
        <span className="fm-page-loader__aura" aria-hidden="true"/>
        <span className="fm-page-loader__orbit" aria-hidden="true"/>
        <FaromidMark className="fm-page-loader__mark"/>
      </div>
    </div>
  </div>;
}
