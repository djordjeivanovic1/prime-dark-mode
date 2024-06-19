document.getElementById('brightnessSlider').addEventListener('input', function() {
    document.getElementById('brightnessValue').textContent = this.value;
});
document.getElementById('contrastSlider').addEventListener('input', function() {
    document.getElementById('contrastValue').textContent = this.value;
});
document.getElementById('sepiaSlider').addEventListener('input', function() {
    document.getElementById('sepiaValue').textContent = this.value;
});
document.getElementById('greyscaleSlider').addEventListener('input', function() {
    document.getElementById('greyscaleValue').textContent = this.value;
});