const apiVersion = "/api/v5";
const apiURL = "https://www.okex.com";
const apiKey = "81ae20c4-ff1d-4c3d-9309-00b9e3d69b0d";
const apiSecret = "12D61B4C6527FAFA58CCE775D7CBD151";

export const Config = {
  status: "staging",
  staging: {
    apiURL,
    apiVersion,
    apiKey,
    apiSecret,
  },
  production: {
    apiURL,
    apiVersion,
    apiKey,
    apiSecret,
  },
};
