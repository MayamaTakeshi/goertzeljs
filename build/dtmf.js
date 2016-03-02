// Generated by CoffeeScript 1.9.3
var DTMF;

DTMF = (function() {
  function DTMF(options) {
    var key;
    if (options == null) {
      options = {};
    }
    this.peakFilterSensitivity = options.peakFilterSensitivity;
    this.downsampleRate = options.downsampleRate || 1;
    this.sampleRate = options.sampleRate / this.downsampleRate;
    this.frequencyTable = {
      697: {
        1209: '1',
        1336: '2',
        1477: '3',
        1633: 'A'
      },
      770: {
        1209: '4',
        1336: '5',
        1477: '6',
        1633: 'B'
      },
      852: {
        1209: '7',
        1336: '8',
        1477: '9',
        1633: 'C'
      },
      941: {
        1209: '*',
        1336: '0',
        1477: '#',
        1633: 'D'
      }
    };
    this.lowFrequencies = [];
    for (key in this.frequencyTable) {
      this.lowFrequencies.push(parseInt(key));
    }
    this.highFrequencies = [];
    for (key in this.frequencyTable[this.lowFrequencies[0]]) {
      this.highFrequencies.push(parseInt(key));
    }
    this.allFrequencies = this.lowFrequencies.concat(this.highFrequencies);
    this.threshold = options.threshold || 0;
    this.repeatCounter = 0;
    this.firstPreviousValue = '';
    this.goertzel = new Goertzel({
      frequencies: this.allFrequencies,
      sampleRate: this.sampleRate,
      threshold: this.threshold
    });
    this.repeatMin = options.repeatMin;
    this.decodeHandlers = [];
  }

  DTMF.prototype.energyProfileToCharacter = function(register) {
    var energies, f, highFrequency, highFrequencyEngergy, j, k, len, len1, lowFrequency, lowFrequencyEnergy, ref, ref1;
    energies = register.energies;
    highFrequency = 0.0;
    highFrequencyEngergy = 0.0;
    ref = this.highFrequencies;
    for (j = 0, len = ref.length; j < len; j++) {
      f = ref[j];
      if (energies[f] > highFrequencyEngergy && energies[f] > this.threshold) {
        highFrequencyEngergy = energies[f];
        highFrequency = f;
      }
    }
    lowFrequency = 0.0;
    lowFrequencyEnergy = 0.0;
    ref1 = this.lowFrequencies;
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      f = ref1[k];
      if (energies[f] > lowFrequencyEnergy && energies[f] > this.threshold) {
        lowFrequencyEnergy = energies[f];
        lowFrequency = f;
      }
    }
    if (this.frequencyTable[lowFrequency] !== void 0) {
      return this.frequencyTable[lowFrequency][highFrequency] || null;
    }
  };

  DTMF.prototype.processBuffer = function(buffer) {
    var badPeaks, f, freq, handler, highEnergies, i, j, len, lowEnergies, ref, result, value;
    value = '';
    highEnergies = [];
    lowEnergies = [];
    result = [];
    Goertzel.Utilities.eachDownsample(buffer, this.downsampleRate, (function(_this) {
      return function(sample, i, downSampledBufferLength) {
        var windowedSample;
        windowedSample = Goertzel.Utilities.exactBlackman(sample, i, downSampledBufferLength);
        _this.goertzel.processSample(windowedSample);
        return value = _this.energyProfileToCharacter(_this.goertzel);
      };
    })(this));
    i = 0;
    highEnergies = [];
    while (i < this.highFrequencies.length) {
      f = this.highFrequencies[i];
      highEnergies.push(this.goertzel.energies[f]);
      i++;
    }
    lowEnergies = [];
    while (i < this.lowFrequencies.length) {
      freq = this.lowFrequencies[i];
      lowEnergies.push(this.goertzel.energies[freq]);
      i++;
    }
    badPeaks = Goertzel.Utilities.doublePeakFilter(highEnergies, lowEnergies, this.peakFilterSensitivity);
    if (badPeaks === false) {
      if (value === this.firstPreviousValue && value !== void 0) {
        this.repeatCounter += 1;
        if (this.repeatCounter === this.repeatMin) {
          result.push(value);
          ref = this.decodeHandlers;
          for (j = 0, len = ref.length; j < len; j++) {
            handler = ref[j];
            setTimeout(handler(value), 0);
          }
        }
      } else {
        this.repeatCounter = 0;
        this.firstPreviousValue = value;
      }
    }
    this.goertzel.refresh();
    return result;
  };

  DTMF.prototype.on = function(eventName, handler) {
    switch (eventName) {
      case "decode":
        return this.decodeHandlers.push(handler);
    }
  };

  return DTMF;

})();

if (typeof module !== "undefined" && module !== null ? module.exports : void 0) {
  module.exports = DTMF;
}
