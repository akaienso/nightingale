import TranslatorApp from './components/translator-app';
import SiteFooter from './components/site-footer';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[100dvh] md:h-[100dvh] md:overflow-hidden">
      <div className="md:flex-1 flex flex-col md:min-h-0">
        <TranslatorApp />
      </div>
      <SiteFooter />
    </div>
  );
}
