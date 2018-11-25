'use_strict';

export const languageDef = {
    defaultToken: "",
    number: /\d+(\.\d+)?/,
    keywords: [
      ".UNIT"
    ],
    tokenizer: {
      root: [
        { include: "@whitespace" },
        { include: "@numbers" },
        { include: "@strings" },
        { include: "@tags" },
        [/^@\w+/, { cases: { "@keywords": "keyword" } }],
      ],
      whitespace: [
        [/\s+/, "white"],
      ],
      numbers: [
        [/@number/, "number"],
      ],
      strings: [
        [/[=|][ @number]*$/, "string.escape"],
        // TODO: implement invalid strings
      ],
      tags: [
        [/^%[a-zA-Z]\w*/, "tag"],
        [/#[a-zA-Z]\w*/, "tag"],
      ],
    },
  }
  
  // This config defines the editor's behavior.
  export const configuration = {
    comments: {
      lineComment: "#",
    },
    brackets: [
      ["{", "}"], ["[", "]"], ["(", ")"],
    ],
  }