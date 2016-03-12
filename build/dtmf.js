var DTMF;

DTMF = (function() {
  function DTMF(options) {
    var key, option;
    if (options == null) {
      options = {};
    }
    this.options = {
      downsampleRate: 1,
      energyThreshold: 0,
      decibelThreshold: 0,
      repeatMin: 0,
      sampleRate: 44100
    };
    for (option in options) {
      this.options[option] = options[option];
    }
    this.sampleRate = this.options.sampleRate / this.options.downsampleRate;
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
    this.repeatCounter = 0;
    this.firstPreviousValue = '';
    this.goertzel = new Goertzel({
      frequencies: this.allFrequencies,
      sampleRate: this.sampleRate
    });
    this.decodeHandlers = [];
    this.jobs = {
      beforeProcess: []
    };
  }

  DTMF.prototype.processBuffer = function(buffer) {
    var energies, f, fType, handler, i, j, k, len, len1, ref, ref1, result, value;
    value = '';
    result = [];
    this._runJobs('beforeProcess', buffer);
    if (this.options.decibelThreshold && (Goertzel.Utilities.averageDecibels(buffer) < this.options.decibelThreshold)) {
      return result;
    }
    Goertzel.Utilities.eachDownsample(buffer, this.options.downsampleRate, (function(_this) {
      return function(sample, i, downSampledBufferLength) {
        var windowedSample;
        windowedSample = Goertzel.Utilities.exactBlackman(sample, i, downSampledBufferLength);
        return _this.goertzel.processSample(windowedSample);
      };
    })(this));
    energies = {
      high: [],
      low: []
    };
    ref = ['high', 'low'];
    for (j = 0, len = ref.length; j < len; j++) {
      fType = ref[j];
      i = 0;
      while (i < this[fType + "Frequencies"].length) {
        f = this[fType + "Frequencies"][i];
        energies[fType].push(this.goertzel.energies[f]);
        i++;
      }
    }
    if ((this.options.filter && this.options.filter({
      goertzel: this.goertzel,
      energies: energies
    })) || !this.options.filter) {
      value = this._energyProfileToCharacter(this.goertzel);
      if (((value === this.firstPreviousValue) || (this.options.repeatMin === 0)) && value !== void 0) {
        if (this.options.repeatMin !== 0) {
          this.repeatCounter += 1;
        }
        if (this.repeatCounter === this.options.repeatMin) {
          result.push(value);
          ref1 = this.decodeHandlers;
          for (k = 0, len1 = ref1.length; k < len1; k++) {
            handler = ref1[k];
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

  DTMF.prototype.calibrate = function(multiplier) {
    var base;
    if (multiplier == null) {
      multiplier = 1;
    }
    (base = this.jobs).beforeProcess || (base.beforeProcess = []);
    return this.jobs.beforeProcess.push(function(buffer, dtmf) {
      return dtmf.options.decibelThreshold = Goertzel.Utilities.averageDecibels(buffer) * multiplier;
    });
  };

  DTMF.prototype._energyProfileToCharacter = function(register) {
    var energies, f, highFrequency, highFrequencyEngergy, j, k, len, len1, lowFrequency, lowFrequencyEnergy, ref, ref1;
    energies = register.energies;
    highFrequency = 0.0;
    highFrequencyEngergy = 0.0;
    ref = this.highFrequencies;
    for (j = 0, len = ref.length; j < len; j++) {
      f = ref[j];
      if (energies[f] > highFrequencyEngergy && energies[f] > this.options.energyThreshold) {
        highFrequencyEngergy = energies[f];
        highFrequency = f;
      }
    }
    lowFrequency = 0.0;
    lowFrequencyEnergy = 0.0;
    ref1 = this.lowFrequencies;
    for (k = 0, len1 = ref1.length; k < len1; k++) {
      f = ref1[k];
      if (energies[f] > lowFrequencyEnergy && energies[f] > this.options.energyThreshold) {
        lowFrequencyEnergy = energies[f];
        lowFrequency = f;
      }
    }
    if (this.frequencyTable[lowFrequency] !== void 0) {
      return this.frequencyTable[lowFrequency][highFrequency] || null;
    }
  };

  DTMF.prototype._runJobs = function(jobName, buffer) {
    var i, queueLength, results;
    if (this.jobs[jobName]) {
      queueLength = this.jobs[jobName].length;
      i = 0;
      results = [];
      while (i < queueLength) {
        this.jobs[jobName].pop()(buffer, this);
        results.push(i++);
      }
      return results;
    }
  };

  return DTMF;

})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DTMF;
} else if (typeof define === 'function' && define.amd) {
  define(function() {
    return DTMF;
  });
} else {
  window.DTMF = DTMF;
}
