import SafeMath from "../../utils/SafeMath";

const originObj = {
  market: "ethusdt",
  asks: [
    ["1937.11", "5.951735"],
    ["1937.22", "6.05"],
    ["1937.28", "3.603643"],
    ["1937.35", "1.089698"],
    ["1937.72", "0.005683"],
    ["1937.91", "0.751486"],
    ["1938.12", "2.583368"],
    ["1938.34", "9.673224"],
    ["1938.81", "15.12"],
    ["1938.84", "3.878"],
  ],
  bids: [
    ["1937.1", "0.503338"],
    ["1936.65", "0.005683"],
    ["1936.64", "0.247571"],
    ["1936.54", "1.059"],
    ["1936.53", "0.972552"],
    ["1936.32", "0.141724"],
    ["1936.31", "1.032"],
    ["1936.1", "0.714539"],
    ["1936.09", "2.583447"],
    ["1936", "0.5"],
  ],
};
const updateObj = {
  market: "ethusdt",
  asks: [
    ["1937.11", "1.04433"],
    ["1937.37", "1.544"],
    ["1937.43", "4.94"],
    ["1937.66", "0.4149"],
    ["1937.69", "0"],
    ["1937.74", "0.011366"],
    ["1937.75", "0"],
    ["1939.11", "0.001295"],
    ["1939.12", "6.210966"],
    ["1939.87", "0"],
    ["1944", "6.84131"],
    ["1952.14", "0.004741"],
    ["1952.17", "0"],
  ],
  bids: [
    ["1937.1", "0.503338"],
    ["1936.89", "0"],
    ["1936.86", "0"],
    ["1936.84", "0.802903"],
    ["1936.74", "0.005683"],
    ["1936.7", "0.005683"],
    ["1936.65", "0"],
    ["1936.32", "0.168949"],
    ["1933.4", "1.032668"],
    ["1930.79", "0"],
    ["1930.35", "1.219234"],
    ["1917.36", "0"],
  ],
};

const expectObj = {
  market: "ethusdt",
  asks: [
    ["1937.11", "1.04433"],
    ["1937.22", "6.05"],
    ["1937.28", "3.603643"],
    ["1937.35", "1.089698"],
    ["1937.37", "1.544"],
    ["1937.43", "4.94"],
    ["1937.72", "0.005683"],
    ["1937.91", "0.751486"],
    ["1938.12", "2.583368"],
    ["1938.34", "9.673224"],
  ],
  bids: [
    ["1937.1", "0.503338"],
    ["1936.89", "0"],
    ["1936.86", "0"],
    ["1936.84", "0.802903"],
    ["1936.74", "0.005683"],
    ["1936.7", "0.005683"],
    ["1936.64", "0.247571"],
    ["1936.54", "1.059"],
    ["1936.53", "0.972552"],
    ["1936.32", "0.168949"],
  ],
};

const formateBooks = (bookObj) => {
  const bookArr = [];
  bookObj.asks.forEach((ask) => {
    bookArr.push({
      price: ask[0],
      amount: ask[1],
      side: "asks",
    });
  });
  bookObj.bids.forEach((bid) => {
    bookArr.push({
      price: bid[0],
      amount: bid[1],
      side: "bids",
    });
  });
  // console.log(`[DepthBook _formateBooks]`, bookArr);
  return bookArr;
};

const trim = (data) => {
  let sumAskAmount = "0",
    sumBidAmount = "0",
    asks = [],
    bids = [];
  data.forEach((d) => {
    // if (d.side === "asks" && asks.length < 30) {  // -- TEST
    if (d.side === "asks" && asks.length < 10) {
      // -- TEST
      asks.push(d);
    }
    // if (d.side === "bids" && bids.length < 30) { // -- TEST
    if (d.side === "bids" && bids.length < 10) {
      // -- TEST
      bids.push(d);
    }
  });
  asks = asks
    .sort((a, b) => +a.price - +b.price) //low to high
    .map((ask) => {
      sumAskAmount = SafeMath.plus(ask.amount, sumAskAmount);
      return { ...ask, total: sumAskAmount };
    });
  bids = bids
    .sort((a, b) => +b.price - +a.price) //high to low
    .map((bid) => {
      sumBidAmount = SafeMath.plus(bid.amount, sumBidAmount);
      return { ...bid, total: sumBidAmount };
    });
  return bids.concat(asks);
};

const getDifference = (preArr, newArr) => {
  const difference = {
    add: [],
    update: [],
    remove: [],
  };
  const update = preArr;
  newArr.forEach((data) => {
    const index = preArr.findIndex((_data) => {
      return SafeMath.eq(data.price, _data.price) && data.side === _data.side;
    });
    console.log(`index`, index);
    console.log(
      `=0?:${SafeMath.eq(data.amount, "0")})=pre?:${SafeMath.eq(
        data.amount,
        preArr[index]?.amount
      )})`,
      data
    );

    if (index === -1 && SafeMath.gt(data.amount, "0")) {
      update.push(data);
      difference.add.push(data);
    }
    if (index !== -1) {
      console.log(`_data: [${index}]`, preArr[index]);
      if (SafeMath.eq(data.amount, "0")) {
        update.splice(index, 1);
        difference.remove.push(data);
      } else if (!SafeMath.eq(data.amount, preArr[index].amount)) {
        update[index] = data;
        console.log(`update: [${index}]`, update[index]);
        difference.update.push(data);
      }
    }
  });
  const snapshot = getSnapshot(update);
  return { snapshot };
};

const range = (arr, unit) => {
  let result = arr;
  let _arr = arr?.map((d) => parseFloat(d.price)) || [];
  if (unit) {
    const max = Math.max(..._arr);
    const min = Math.min(..._arr);
    const start = min - (min % unit);
    const end = max % unit === 0 ? max : max - (max % unit) + 1;
    const length = parseInt((end - start) / unit);

    result = {};
    for (let i = 0; i < length; i++) {
      const price = start + unit * i;
      const data = { amount: "0", price, side: "" };
      result[price] = data;
    }
    console.log(`result`, result);
    for (let i = 0; i < arr.length; i++) {
      const p = arr[i];
      let price = parseInt(parseFloat(p.price) / unit) * unit;
      if (p.side === "asks" && parseFloat(p.price) % unit > 0) price += unit; //++TODO
      console.log(
        `result[${price}](${
          p.side === "asks" && parseFloat(p.price) % unit > 0
        })`,
        result[price]
      );
      if (result[price]) {
        if (SafeMath.eq(result[price].amount, "0")) {
          result[price] = { ...p, price };
        } else {
          result[price].amount = parseFloat(result[price].amount) + p.amount;
        }
      } else {
        result[price] = { ...p, price };
      }
    }
  }
  return Object.values(result);
};

const getSnapshot = (arr) => {
  const depthBooks = {
    asks: [],
    bids: [],
  };
  const rangedArr = range(arr, 1);
  for (let i = 0; i < rangedArr.length; i++) {
    const data = rangedArr[i];
    if (data.side === "asks") {
      depthBooks.asks.push([data.price, data.amount]);
    }
    if (data.side === "bids") {
      depthBooks.bids.push([data.price, data.amount]);
    }
  }
  return depthBooks;
};

describe("test range", () => {
  test("if true", () => {
    const startTime = Date.now();
    const arr = [
      {
        price: "1789.11",
        amount: "0.033084",
        total: "0.033084",
        side: "asks",
      },
      { price: "1789.26", amount: "0.636", total: "0.669084", side: "asks" },
      {
        price: "1789.31",
        amount: "1.212906",
        total: "1.88199",
        side: "asks",
      },
      { price: "1789.36", amount: "0.149", total: "2.03099", side: "asks" },
      { price: "1789.44", amount: "0.86", total: "2.89099", side: "asks" },
      {
        price: "1789.46",
        amount: "2.797034",
        total: "5.688024",
        side: "asks",
      },
      {
        price: "1789.64",
        amount: "2.25221",
        total: "7.940234",
        side: "asks",
      },
      { price: "1789.71", amount: "0.149", total: "8.089234", side: "asks" },
      {
        price: "1789.9",
        amount: "0.559",
        total: "8.648234",
        side: "asks",
      },
      {
        price: "1790.01",
        amount: "2.541803",
        total: "11.190037",
        side: "asks",
      },
      {
        price: "1790.07",
        amount: "0.149",
        total: "11.339037",
        side: "asks",
      },
      {
        price: "1790.25",
        amount: "1.654159",
        total: "12.993196",
        side: "asks",
      },
      {
        price: "1790.43",
        amount: "1.850994",
        total: "14.84419",
        side: "asks",
      },
      {
        price: "1790.61",
        amount: "2.442207",
        total: "17.286397",
        side: "asks",
      },
      {
        price: "1790.63",
        amount: "51.160301",
        total: "68.446698",
        side: "asks",
      },
      {
        price: "1790.79",
        amount: "1.499262",
        total: "69.94596",
        side: "asks",
      },
      {
        price: "1790.98",
        amount: "0.86",
        total: "70.80596",
        side: "asks",
      },
      {
        price: "1791.15",
        amount: "0.149",
        total: "70.95496",
        side: "asks",
      },
      {
        price: "1791.16",
        amount: "5.693972",
        total: "76.648932",
        side: "asks",
      },
      {
        price: "1791.43",
        amount: "0.86",
        total: "77.508932",
        side: "asks",
      },
      {
        price: "1791.67",
        amount: "0.86",
        total: "78.368932",
        side: "asks",
      },
      {
        price: "1791.86",
        amount: "0.149",
        total: "78.517932",
        side: "asks",
      },
      {
        price: "1791.98",
        amount: "0.86",
        total: "79.377932",
        side: "asks",
      },
      {
        price: "1792.11",
        amount: "5.288085",
        total: "84.666017",
        side: "asks",
      },
      {
        price: "1792.22",
        amount: "1.125001",
        total: "85.791018",
        side: "asks",
      },
      {
        price: "1792.4",
        amount: "1.9922",
        total: "87.783218",
        side: "asks",
      },
      {
        price: "1792.58",
        amount: "1.009",
        total: "88.792218",
        side: "asks",
      },
      {
        price: "1792.62",
        amount: "0.174759",
        total: "88.966977",
        side: "asks",
      },
      {
        price: "1792.64",
        amount: "1.073957",
        total: "90.040934",
        side: "asks",
      },
      {
        price: "1792.76",
        amount: "0.149",
        total: "90.189934",
        side: "asks",
      },
      {
        price: "1792.93",
        amount: "0.86",
        total: "91.049934",
        side: "asks",
      },
      {
        price: "1792.94",
        amount: "0.149",
        total: "91.198934",
        side: "asks",
      },
      {
        price: "1793",
        amount: "0.1",
        total: "91.298934",
        side: "asks",
      },
      {
        price: "1793.01",
        amount: "0.054593",
        total: "91.353527",
        side: "asks",
      },
      {
        price: "1793.12",
        amount: "1.009",
        total: "92.362527",
        side: "asks",
      },
      {
        price: "1793.3",
        amount: "1.009",
        total: "93.371527",
        side: "asks",
      },
      {
        price: "1793.54",
        amount: "0.003003",
        total: "93.37453",
        side: "asks",
      },
      {
        price: "1793.56",
        amount: "0.86",
        total: "94.23453",
        side: "asks",
      },
      {
        price: "1794",
        amount: "6.5",
        total: "100.73453",
        side: "asks",
      },
      {
        price: "1794.34",
        amount: "0.111404",
        total: "100.845934",
        side: "asks",
      },
      {
        price: "1794.49",
        amount: "0.111404",
        total: "100.957338",
        side: "asks",
      },
      {
        price: "1794.8",
        amount: "0.002974",
        total: "100.960312",
        side: "asks",
      },
      {
        price: "1794.92",
        amount: "0.038842",
        total: "100.999154",
        side: "asks",
      },
      {
        price: "1796.17",
        amount: "0.149",
        total: "101.148154",
        side: "asks",
      },
      {
        price: "1796.3",
        amount: "4.919077",
        total: "106.067231",
        side: "asks",
      },
      {
        price: "1798.76",
        amount: "0.05",
        total: "106.117231",
        side: "asks",
      },
      {
        price: "1798.92",
        amount: "21.694951",
        total: "127.812182",
        side: "asks",
      },
      {
        price: "1800",
        amount: "167.033461",
        total: "294.845643",
        side: "asks",
      },
      {
        price: "1800.98",
        amount: "0.027723",
        total: "294.873366",
        side: "asks",
      },
      {
        price: "1802",
        amount: "51.053358",
        total: "345.926724",
        side: "asks",
      },
      {
        price: "1782.85",
        amount: "0.013655",
        total: "154.326963",
        side: "bids",
        update: true,
      },
      {
        price: "1784",
        amount: "30.654265",
        total: "154.313308",
        side: "bids",
        update: true,
      },
      {
        price: "1785.58",
        amount: "0.86",
        total: "123.659043",
        side: "bids",
        update: true,
      },
      {
        price: "1785.6",
        amount: "0.745135",
        total: "122.799043",
        side: "bids",
        update: true,
      },
      {
        price: "1785.88",
        amount: "1",
        total: "122.053908",
        side: "bids",
        update: true,
      },
      {
        price: "1785.98",
        amount: "0.515858",
        total: "121.053908",
        side: "bids",
        update: true,
      },
      {
        price: "1786.32",
        amount: "1.825774",
        total: "120.53805",
        side: "bids",
        update: true,
      },
      {
        price: "1786.68",
        amount: "1.825446",
        total: "118.712276",
        side: "bids",
        update: true,
      },
      {
        price: "1786.95",
        amount: "0.565031",
        total: "116.88683",
        side: "bids",
        update: true,
      },
      {
        price: "1787.2",
        amount: "0.008015",
        total: "116.321799",
        side: "bids",
        update: true,
      },
      {
        price: "1787.3",
        amount: "1.500147",
        total: "116.313784",
        side: "bids",
        update: true,
      },
      {
        price: "1787.75",
        amount: "8.449",
        total: "114.813637",
        side: "bids",
        update: true,
      },
      {
        price: "1787.76",
        amount: "1.675397",
        total: "106.364637",
        side: "bids",
        update: true,
      },
      {
        price: "1787.91",
        amount: "1.660387",
        total: "104.68924",
        side: "bids",
        update: true,
      },
      {
        price: "1787.98",
        amount: "0.800112",
        total: "103.028853",
        side: "bids",
        update: true,
      },
      {
        price: "1788.09",
        amount: "8.361",
        total: "102.228741",
        side: "bids",
        update: true,
      },
      {
        price: "1788.12",
        amount: "2.1",
        total: "93.867741",
        side: "bids",
        update: true,
      },
      {
        price: "1788.26",
        amount: "0.109068",
        total: "91.767741",
        side: "bids",
        update: true,
      },
      {
        price: "1788.31",
        amount: "1.978",
        total: "91.658673",
        side: "bids",
        update: true,
      },
      { price: "1788.36", amount: "1.398", total: "89.680673", side: "bids" },
      {
        price: "1788.43",
        amount: "2.612043",
        total: "88.282673",
        side: "bids",
      },
      { price: "1788.46", amount: "0.149", total: "85.67063", side: "bids" },
      {
        price: "1788.47",
        amount: "4.195383",
        total: "85.52163",
        side: "bids",
      },
      {
        price: "1788.48",
        amount: "1.533548",
        total: "81.326247",
        side: "bids",
      },
      {
        price: "1788.49",
        amount: "38.400535",
        total: "79.792699",
        side: "bids",
      },
      {
        price: "1788.5",
        amount: "0.001611",
        total: "41.392164",
        side: "bids",
      },
      {
        price: "1788.52",
        amount: "10.030229",
        total: "41.390553",
        side: "bids",
      },
      { price: "1788.57", amount: "4.992", total: "31.360324", side: "bids" },
      {
        price: "1788.58",
        amount: "0.4457",
        total: "26.368324",
        side: "bids",
      },
      {
        price: "1788.6",
        amount: "0.109401",
        total: "25.922624",
        side: "bids",
      },
      {
        price: "1788.61",
        amount: "0.099994",
        total: "25.813223",
        side: "bids",
      },
      {
        price: "1788.63",
        amount: "0.470243",
        total: "25.713229",
        side: "bids",
      },
      { price: "1788.64", amount: "0.149", total: "25.242986", side: "bids" },
      {
        price: "1788.65",
        amount: "0.832705",
        total: "25.093986",
        side: "bids",
      },
      {
        price: "1788.7",
        amount: "0.017382",
        total: "24.261281",
        side: "bids",
      },
      {
        price: "1788.75",
        amount: "0.005523",
        total: "24.243899",
        side: "bids",
      },
      { price: "1788.82", amount: "0.15", total: "24.238376", side: "bids" },
      {
        price: "1788.85",
        amount: "0.223607",
        total: "24.088376",
        side: "bids",
      },
      {
        price: "1788.86",
        amount: "6.365949",
        total: "23.864769",
        side: "bids",
      },
      {
        price: "1788.88",
        amount: "0.006075",
        total: "17.49882",
        side: "bids",
      },
      {
        price: "1788.89",
        amount: "0.010249",
        total: "17.492745",
        side: "bids",
      },
      {
        price: "1788.92",
        amount: "0.925637",
        total: "17.482496",
        side: "bids",
      },
      { price: "1788.94", amount: "0.004", total: "16.556859", side: "bids" },
      { price: "1788.96", amount: "2.793", total: "16.552859", side: "bids" },
      { price: "1789", amount: "0.158352", total: "13.759859", side: "bids" },
      {
        price: "1789.03",
        amount: "0.0013",
        total: "13.601507",
        side: "bids",
      },
      {
        price: "1789.05",
        amount: "5.20934",
        total: "13.600207",
        side: "bids",
      },
      {
        price: "1789.06",
        amount: "0.001999",
        total: "8.390867",
        side: "bids",
      },
      {
        price: "1789.08",
        amount: "0.111788",
        total: "8.388868",
        side: "bids",
      },
      { price: "1789.09", amount: "8.27708", total: "8.27708", side: "bids" },
    ];
    // for (let i = 0; i < 10000; i++) {
    //   getSnapshot(arr);
    // }
    const endTime = Date.now();
    console.log(endTime - startTime);
    expect(getSnapshot(arr)).toBe();
  });
});

// describe("formateBooks", () => {
//   test("if true", () => {
//     const result = {
//       snapshot: {
//         asks: [
//           ["1937.11", "1.04433"],
//           ["1937.22", "6.05"],
//           ["1937.28", "3.603643"],
//           ["1937.35", "1.089698"],
//           ["1937.72", "0.005683"],
//           ["1937.91", "0.751486"],
//           ["1938.12", "2.583368"],
//           ["1938.34", "9.673224"],
//           ["1938.81", "15.12"],
//           ["1938.84", "3.878"],
//           ["1937.37", "1.544"],
//           ["1937.43", "4.94"],
//           ["1937.66", "0.4149"],
//           ["1937.74", "0.011366"],
//           ["1939.11", "0.001295"],
//           ["1939.12", "6.210966"],
//           ["1944", "6.84131"],
//           ["1952.14", "0.004741"],
//         ],
//         bids: [
//           ["1937.1", "0.503338"],
//           ["1936.64", "0.247571"],
//           ["1936.54", "1.059"],
//           ["1936.53", "0.972552"],
//           ["1936.32", "0.168949"],
//           ["1936.31", "1.032"],
//           ["1936.1", "0.714539"],
//           ["1936.09", "2.583447"],
//           ["1936", "0.5"],
//           ["1936.84", "0.802903"],
//           ["1936.74", "0.005683"],
//           ["1936.7", "0.005683"],
//           ["1933.4", "1.032668"],
//           ["1930.35", "1.219234"],
//         ],
//       },
//     };
//     expect(
//       getDifference(formateBooks(originObj), formateBooks(updateObj))
//     ).toBe();
//   });
// });
