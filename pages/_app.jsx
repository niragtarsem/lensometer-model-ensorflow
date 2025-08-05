// _app.jsx

import 'bootstrap/dist/css/bootstrap.min.css';
import ConnectionStatus from '@/components/Connectionspeed';
function MyApp({ Component, pageProps }) {
  return (
    <>
      <ConnectionStatus/>
      <Component {...pageProps} />
    </>
  );
}

export default MyApp;


