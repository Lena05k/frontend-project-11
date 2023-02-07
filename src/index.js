import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import i18next from 'i18next';
import resources from './locales/index.js';
import './style.scss';
import app from './app.js';

const runApp = () => {
  const i18nextInstance = i18next.createInstance();
  i18nextInstance.init({
    lng: 'ru',
    debug: false,
    resources,
  })
    .then(() => {
      app(i18nextInstance);
    });
};

runApp();
