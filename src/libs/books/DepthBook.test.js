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
    for (let i = 0; i < length + 1; i++) {
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
      { amount: "1.0", price: "12.0", side: "bids", total: "1" },
      { amount: "1.0", price: "11.0", side: "bids", total: "1" },
      { amount: "1.0", price: "10.0", side: "bids", total: "2" },
    ];
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
