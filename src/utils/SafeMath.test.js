import SafeMath from "./SafeMath";
describe("SafeMath take time", () => {
  test("time", () => {
    const startTime = Date.now();
    for (let i = 0; i < 10000; i++) {
        
      let end = SafeMath.eq(SafeMath.mod(1789.11, 0.1), "0")
        ? 1789.11
        : SafeMath.plus(
            SafeMath.minus(1789.11, SafeMath.mod(1789.11, 0.1)),
            "1"
          );
    }
    const endTime = Date.now();
    console.log(endTime - startTime);
  });
//   expect().toBe();
});
