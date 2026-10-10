import { describe, expect, it } from "vitest";
import { buildExtractResult } from "@/app/lib/extract";

function extract(text: string, templates: Parameters<typeof buildExtractResult>[0]["templates"], customPattern = "") {
  return buildExtractResult({
    rows: [{ 内容: text }],
    columns: ["内容"],
    sourceFields: ["内容"],
    templates,
    customPattern,
  });
}

describe("buildExtractResult", () => {
  it("多个手机号按序号扩展列", () => {
    const result = extract("联系 13800138000 或 13912345678", ["mobile"]);
    expect(result.columns).toEqual(["内容", "提取手机号1", "提取手机号2"]);
    expect(result.rows[0].data["提取手机号2"]).toBe("13912345678");
    expect(result.extractedByColumn["提取手机号"]).toBe(1);
  });

  it("身份证校验出生日期和校验位", () => {
    expect(extract("11010519491231002X", ["id-card"]).rows[0].data["提取身份证号"]).toBe("11010519491231002X");
    expect(extract("110105194913310021", ["id-card"]).rows[0].data["提取身份证号"]).toBe("");
    expect(extract("110105194912310021", ["id-card"]).rows[0].data["提取身份证号"]).toBe("");
  });

  it("银行卡做 Luhn 校验，并排除身份证和支付宝号", () => {
    expect(extract("卡号 6222600260001072444", ["bank-card"]).rows[0].data["提取银行卡号"]).toBe("6222600260001072444");
    expect(extract("卡号 6222600260001072445", ["bank-card"]).rows[0].data["提取银行卡号"]).toBe("");
    expect(extract("11010519491231002X", ["bank-card"]).rows[0].data["提取银行卡号"]).toBe("");
    expect(extract("2088102122524333", ["bank-card"]).rows[0].data["提取银行卡号"]).toBe("");
  });

  it("财付通不被邮箱模板重复命中", () => {
    const result = extract("abc123@wx.tenpay.com a@b.com", ["email", "tenpay"]);
    expect(result.rows[0].data["提取邮箱"]).toBe("a@b.com");
    expect(result.rows[0].data["提取财付通"]).toBe("abc123@wx.tenpay.com");
  });

  it("多个源列独立匹配，不跨列拼接", () => {
    const result = buildExtractResult({
      rows: [{ a: "138001", b: "38000" }],
      columns: ["a", "b"],
      sourceFields: ["a", "b"],
      templates: ["mobile"],
      customPattern: "",
    });
    expect(result.extracted).toBe(0);
  });

  it("自定义正则使用命名分组作为列名，非法正则报错", () => {
    const result = extract("金额 12.5元", ["custom"], "(?<金额>\\d+(?:\\.\\d{1,2})?)元");
    expect(result.rows[0].data["金额"]).toBe("12.5");
    expect(extract("x", ["custom"], "(").error).toContain("自定义正则无效");
  });
});
