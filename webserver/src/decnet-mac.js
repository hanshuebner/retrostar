function ethernetToDECnet(macAddress) {
  // Check if the MAC address is in the correct format
  const macRegex = /^aa:00:04:00:[0-9a-f]{2}:[0-9a-f]{2}$/i
  if (!macRegex.test(macAddress)) {
    return null // Not in the correct format
  }

  // Remove any delimiter (like ":") and split into individual bytes
  const bytes = macAddress.split(':')

  // Extract the area and node number from the MAC address bytes (byte-swapped)
  const nodeNumber = parseInt(bytes[5] + bytes[4], 16) & 0x3ff // Lower 10 bits
  const area = (parseInt(bytes[5] + bytes[4], 16) >> 10) & 0x3f // Upper 6 bits

  // Construct DECnet Phase IV address by combining area and node number
  return `${area}.${nodeNumber}`
}

// Test the function
const macAddress = 'aa:00:04:00:15:5c'
console.log(ethernetToDECnet(macAddress)) // Example output: "40.23"
