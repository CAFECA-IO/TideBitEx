const apiVersion = "/api/v1";
// const apiURL = "https://www.okex.com";
const apiURL = "http://127.0.0.1";

export const Config = {
  status: "staging",
  staging: {
    apiURL,
    apiVersion,
  },
  production: {
    apiURL,
    apiVersion,
  },
};
