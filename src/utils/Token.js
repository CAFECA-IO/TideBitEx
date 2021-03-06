// import { request } from "http";
const axios = require("axios");

export const getToken = async (XSRF) => {
  try {
    const response = await axios({
      method: "GET",
      url: `${window.location.href.replace(`markets`, "markets_origin")}`,
    });
    const csrf = response.data.match(
      /(?:<meta name="csrf-token" content=").*(?=" \/>)/g
    );
    if (csrf.length > 0) {
      return csrf[0].replace('<meta name="csrf-token" content="', "");
    } else {
      return null;
    }
  } catch (error) {
    console.error(`getToken error`, error);
  }
};
// export const getToken = (XSRF) => {
//   return new Promise((resolve, reject) => {
//     // const headers = {
//     //   Cookie: `XSRF-TOKEN=${XSRF}`,
//     // };

//     // const options = {
//     //   protocol: "http",
//     //   hostname: "15.164.99.239",
//     //   port: 80,
//     //   headers,
//     //   url: "/markets/ethusd",
//     //   method: "GET",
//     // };

//     let response = "";
//     const req = request(
//       `${window.location.href.replace(`markets`, "markets_origin")}`,
//       (res) => {
//         if (res.statusCode < 200 || res.statusCode >= 300) {
//           return reject(new Error("statusCode=" + res.statusCode));
//         }

//         res.on("data", (d) => {
//           response += d;
//         });

//         res.on("end", (d) => {
//           const csrf = response.match(
//             /(?<=<meta name="csrf-token" content=").*(?=" \/>)/g
//           );
//           if (csrf.length > 0) {
//             resolve(csrf[0]);
//           } else {
//             resolve(null);
//           }
//         });
//       }
//     );

//     req.on("getToken error", (error) => {
//       console.error(error);
//       reject(error);
//     });

//     req.end();
//   });
// };
