const macRegex = /^aa[-:]00[-:]04[-:]00[-:][0-9a-f]{2}[-:][0-9a-f]{2}$/i

const ethernetToDecnet = (macAddress) => {
  if (!macRegex.test(macAddress)) {
    return null // Not in the correct format
  }

  const bytes = macAddress.split(/[-:]/)

  const nodeNumber = parseInt(bytes[5] + bytes[4], 16) & 0x3ff // Lower 10 bits
  const area = (parseInt(bytes[5] + bytes[4], 16) >> 10) & 0x3f // Upper 6 bits

  return `${area}.${nodeNumber}`
}

module.exports = ethernetToDecnet
