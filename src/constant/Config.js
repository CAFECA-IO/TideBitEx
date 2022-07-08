const apiVersion = "/api/v1";
// const apiURL = "https://www.okex.com";

/* ++ TODO
const host = "3.37.130.251";
const port = "5566";
const apiURL = `http://${host}:${port}`;
const websocket = `${
  window.location.protocol === "https:" ? "wss://" : "ws://"
}${host}:${port}/ws`;
*/

// -- TEST
const apiURL = ``;
const websocket =
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host +
  "/ws";
// --

export const Config = {
  status: "staging",
  staging: {
    apiURL,
    apiVersion,
    websocket,
  },
  production: {
    apiURL,
    apiVersion,
    websocket,
  },
};
