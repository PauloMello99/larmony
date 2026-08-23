import { resolveCategoryCode } from "./category-code-resolver";

describe("resolveCategoryCode", () => {
  it("categoria default com nome batendo no mapa → código correspondente", () => {
    expect(resolveCategoryCode("Alimentação", true)).toBe("ALI");
    expect(resolveCategoryCode("Salário", true)).toBe("SAL");
  });

  it("categoria custom (isDefault=false) → undefined, mesmo se o nome coincidir", () => {
    expect(resolveCategoryCode("Alimentação", false)).toBeUndefined();
  });

  it("categoria default renomeada (nome não bate com nenhum default) → undefined", () => {
    expect(resolveCategoryCode("Comida da Galera", true)).toBeUndefined();
  });
});
