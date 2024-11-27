export const downloadSVG = (svgElement: SVGElement, filename: string = 'map-export.svg') => {
  // Get the SVG content
  const svgData = new XMLSerializer().serializeToString(svgElement);
  
  // Create a Blob with the SVG content
  const blob = new Blob([svgData], { type: 'image/svg+xml' });
  
  // Create a download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Trigger the download
  document.body.appendChild(link);
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}; 