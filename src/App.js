import React, { Component } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import Index from "./pages";
import { SnackbarProvider } from "notistack";
import StoreProvider from "./store/StoreProvider";
export default class App extends Component {
  state = {
    theme: "light",
  };
  render() {
    return (
      <ThemeProvider
        value={{
          data: this.state,
          update: () => {
            this.setState((state) => ({
              theme:
                state.theme === "light"
                  ? (this.theme = "dark")
                  : (this.theme = "light"),
            }));
          },
        }}
      >
        <SnackbarProvider maxSnack={10}>
          <StoreProvider>
            <Index />
          </StoreProvider>
        </SnackbarProvider>
      </ThemeProvider>
    );
  }
}
