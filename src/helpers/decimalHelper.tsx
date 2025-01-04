export default function decimalHelper(func: any, event: any) {
  //disallow anything that's not a number, except for decimal points, but only allow one and only allow 2 chars after the decimal.
  const validChars = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "."];
  const valueAfterDecimal = event.target.value.slice(
    event.target.value.indexOf(".")
  );
  const numberOfDecimals = [];
  for (const v of event.target.value) {
    if (v === ".") {
      numberOfDecimals.push(v);
    }
  }
  if (
    event.nativeEvent.data === null ||
    (validChars.includes(event.nativeEvent.data) &&
      valueAfterDecimal.length < 4 &&
      numberOfDecimals.length < 2)
  ) {
    if (event.target.value === ".") {
      console.log(event.target.value);
      let addZero = "0" + event.target.value;
      func(addZero);
    } else {
      func(event.target.value);
    }
  }
}
