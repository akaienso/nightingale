import TranslatorApp from './components/translator-app';
import SiteFooter from './components/site-footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <TranslatorApp />
      </div>
      <SiteFooter />
    </div>
  );
}
