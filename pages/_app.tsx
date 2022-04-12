import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { GlobalStyles, ThemeContext, magma, I18nContext, defaultI18n } from 'react-magma-dom'
import { AuthProvider } from '../context/AuthContext'
import { CourseProvider } from '../context/CourseContext'
import AppHeader from '../components/header/app-header'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <AuthProvider>
        <CourseProvider>
          <ThemeContext.Provider value={magma}>
            <I18nContext.Provider value={defaultI18n}>
              <GlobalStyles />
              <AppHeader />
              <Component {...pageProps} />
            </I18nContext.Provider>
          </ThemeContext.Provider>
        </CourseProvider>
      </AuthProvider>
    </>
  );
}

export default MyApp
