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
  let result = [...arr];
  if (unit) {
    const max = Math.max(...arr.map((d) => parseFloat(d.price)));
    const min = Math.min(...arr.map((d) => parseFloat(d.price)));
    console.log(`range max`, max);
    console.log(`range min`, min);
    const start = SafeMath.minus(min, SafeMath.mod(min, unit));
    const end = SafeMath.eq(SafeMath.mod(max, unit), "0")
      ? max
      : SafeMath.plus(SafeMath.minus(max, SafeMath.mod(max, unit)), "1");
    const length = parseInt(SafeMath.div(SafeMath.minus(end, start), unit));
    console.log(`range start`, start);
    console.log(`range end`, end);
    console.log(`range length`, length);
    result = [];
    for (let i = 0; i < length; i++) {
      const price = SafeMath.plus(start, SafeMath.mult(unit, i));
      const data = { amount: "0", price, side: "" };
      result.push(data);
    }
    console.log(`range result`, result);
    arr.forEach((p, i) => {
      const price = SafeMath.mult(parseInt(SafeMath.div(p.price, unit)), unit);
      console.log(`p.price[${i}]`, p, `price`, price);
      const index = result.findIndex((v) => SafeMath.eq(v.price, price));
      console.log(`index`, index);
      if (index > -1) {
        if (SafeMath.eq(result[index].amount, "0")) {
          result[index] = { ...p , price: result[index].price };
        } else if (result[index].side !== p.side) {
          result.push({ ...p, price: result[index].price });
        } else {
          result[index].amount = SafeMath.plus(result[index].amount, p.amount);
        }
      } else {
        result.push(p);
      }
    });
  }
  return result;
};

const getSnapshot = (arr) => {
  const depthBooks = {
    asks: [],
    bids: [],
  };
  range(arr,0.1).forEach((data) => {
    if (data.side === "asks") {
      depthBooks.asks.push([data.price, data.amount]);
    }
    if (data.side === "bids") {
      depthBooks.bids.push([data.price, data.amount]);
    }
  });
  return depthBooks;
};

describe("test range", () => {
  test("if true", () => {
    const arr = [
      { amount: "5.951735", price: "1937.11", side: "asks" },
      { amount: "6.05", price: "1937.22", side: "asks" },
      { amount: "3.603643", price: "1937.28", side: "asks" },
      { amount: "1.089698", price: "1937.35", side: "asks" },
      { amount: "0.005683", price: "1937.72", side: "asks" },
      { amount: "0.751486", price: "1937.91", side: "asks" },
      { amount: "2.583368", price: "1938.12", side: "asks" },
      { amount: "9.673224", price: "1938.34", side: "asks" },
      { amount: "15.12", price: "1938.81", side: "asks" },
      { amount: "3.878", price: "1938.84", side: "asks" },
      { amount: "0.503338", price: "1937.1", side: "bids" },
      { amount: "0.005683", price: "1936.65", side: "bids" },
      { amount: "0.247571", price: "1936.64", side: "bids" },
      { amount: "1.059", price: "1936.54", side: "bids" },
      { amount: "0.972552", price: "1936.53", side: "bids" },
      { amount: "0.141724", price: "1936.32", side: "bids" },
      { amount: "1.032", price: "1936.31", side: "bids" },
      { amount: "0.714539", price: "1936.1", side: "bids" },
      { amount: "2.583447", price: "1936.09", side: "bids" },
      { amount: "0.5", price: "1936", side: "bids" },
    ];
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
