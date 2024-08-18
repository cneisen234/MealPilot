function cleanAIResponse(response) {
  // Remove extra symbols and clean up formatting
  let cleanedResponse = response
    .replace(/#+/g, "") // Remove hash symbols
    .replace(/\*\*/g, "") // Remove asterisks
    .replace(/^-\s*/gm, "") // Remove leading dashes
    .replace(/\n+/g, "\n")
    .trim(); // Remove extra newlines

  // Split the response into lines
  let lines = cleanedResponse.split("\n");
  let formattedLines = [];
  let inNumberedList = false;
  let listCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    // Check for section headers or important phrases
    if (line.includes(":")) {
      let [title, content] = line.split(":");
      formattedLines.push(`**${title.trim()}:** ${content.trim()}`);
      inNumberedList = false;
      listCounter = listCounter++;
    }
    // Check for numbered items
    else if (line.match(/^\d+\./)) {
      formattedLines.push(
        `${listCounter}. ${line.replace(/^\d+\./, "").trim()}`
      );
      inNumberedList = true;
      listCounter++;
    }
    // Continue numbered list if we're in one
    else if (inNumberedList && line) {
      formattedLines.push(`${listCounter}. ${line}`);
      listCounter++;
    }
    // Regular text
    else if (line) {
      formattedLines.push(line);
      inNumberedList = false;
      listCounter = 1;
    }
  }

  // Join the lines back together
  return formattedLines.join("\n\n");
}

module.exports = cleanAIResponse;
