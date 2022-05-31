import SafeMath from "./SafeMath";
import { formateDecimal } from "./Utils";

describe("formate number to desire length", () => {
  test("true is working properly", () => {
    expect(
      formateDecimal("31552.5", {
        maxLength: 6,
        decimalLength: 4,
        pad: true,
      })
    ).toBe("31552.5");
    expect(
      formateDecimal("31552.5", {
        maxLength: 18,
        decimalLength: 4,
        pad: true,
      })
    ).toBe("31552.5000");
    expect(
      formateDecimal("0.06902293", {
        maxLength: 18,
        decimalLength: 4,
        pad: true,
      })
    ).toBe("0.0690");
    expect(
      formateDecimal("1000.0", {
        maxLength: 2,
        decimalLength: 4,
        pad: true,
      })
    ).toBe("1.00k");
    expect(
      formateDecimal("0.03361424231424525741", {
        maxLength: 18,
        decimalLength: 2,
        pad: true,
      })
    ).toBe("0.03");
    expect(
      formateDecimal(SafeMath.mult("0.03361424231424525741", "100"), {
        maxLength: 18,
        decimalLength: 2,
        pad: true,
      })
    ).toBe("3.36");
    expect(
      formateDecimal(SafeMath.mult("-0.875", "100"), {
        maxLength: 18,
        decimalLength: 2,
        pad: true,
      })
    ).toBe("-87.50");
    expect(
      formateDecimal(SafeMath.mult("0.875", "100"), {
        maxLength: 18,
        decimalLength: 2,
        pad: true,
        withSign:true
      })
    ).toBe("+87.50");
    expect(
      formateDecimal(SafeMath.mult("0.875", "100"), {
        maxLength: 18,
        decimalLength: 2,
        pad: true,
      })
    ).toBe("87.50");
  });
});
