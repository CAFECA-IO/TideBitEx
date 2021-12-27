import React, { Component } from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import Index from './pages';
export default class App extends Component {
  state = {
    theme: 'light',
  };
  render() {
    return (
      <>
        <BrowserRouter>
          <Route component={ScrollToTop} />
          <ThemeProvider
            value={{
              data: this.state,
              update: () => {
                this.setState((state) => ({
                  theme:
                    state.theme === 'light'
                      ? (this.theme = 'dark')
                      : (this.theme = 'light'),
                }));
              },
            }}
          >
            <Index />
          </ThemeProvider>
        </BrowserRouter>
      </>
    );
  }
}

const ScrollToTop = () => {
  window.scrollTo(0, 0);
  return null;
};
