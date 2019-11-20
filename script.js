let config = {
    url: 'http://192.168.1.225',
    multi: true,
    kitchenRight: 'http://192.168.1.169',
    kitchenLeft: 'http://192.168.1.167' // Optional - only required if `multi` is true
};

let globalStatus = 0;
let currentColors = {};
let rgbBrightnessChange = false;

$(document).ready(function() {
    // Cache buster added because caching was a big problem on mobile
    let cacheBuster = new Date().getTime();

    // btnStatus();
    getLEDStatus('rgb');
    getLEDStatus('white');

    // RGB Slider
    let slider = document.getElementById('slider');
    // White Slider
    let wSlider = document.getElementById('wSlider');

    const pickr = Pickr.create({
        el: '.color-picker',
        theme: 'classic', // or 'monolith', or 'nano'
        lockOpacity: true,
        padding: 15,
        inline: true,

        swatches: [
            'rgba(255, 0, 0, 1)',
            'rgba(255, 82, 0, 1)',
            'rgba(0, 255, 0, 1)',
            'rgba(0, 0, 255, 1)',
            'rgba(27, 161, 17, 1)',
            'rgba(255, 255, 0, 1)', // yellow broken
            'rgba(255, 0, 255, 1)',
            'rgba(108, 16, 157, 1)',
            'rgba(0, 255, 255, 1)',
            'rgba(24, 139, 167, 1)',
            'rgba(255, 255, 255, 1)',
            'rgba(0, 0, 0, 1)',
        ],

        components: {

            // Main components
            preview: true,
            opacity: false,
            hue: true,

            // Input / output Options
            interaction: {
                hex: true,
                rgba: true,
                // hsla: true,
                // hsva: true,
                // cmyk: true,
                input: true,
                // clear: true,
                save: true
            }
        }
    });

    pickr.off().on('swatchselect', e => {
        // sendData(e); // Swatchselect apparently triggers save so it triggers sendData() automatically
        pickr.setColor(e.toRGBA().toString(0));
    });

    pickr.on('save', e => {
        // If 'save' is being triggered by brightness changes instead
        if(rgbBrightnessChange == false) {
            let tempColors = pickr.getColor().toRGBA();
            currentColors.red = Math.floor(tempColors[0]);
            currentColors.green = Math.floor(tempColors[1]);
            currentColors.blue = Math.floor(tempColors[2]);
            slider.noUiSlider.set(100); // sets slider value to 100 if color is changed manually
            $('#slider .noUi-connect').css('background', `rgb(${currentColors.red}, ${currentColors.green}, ${currentColors.blue}`);
        } else {
            rgbBrightnessChange = false;
        }
        sendData(e);
    });

    noUiSlider.create(slider, {
        behavior: "tap",
        start: [100],
        connect: [true, false],
        // direction: 'rtl',
        step: 5,
        range: {
            'min': [0],
            'max': [100]
        },
        pips: {
            mode: 'values',
            values: [0, 25, 50, 75, 100],
            density: 5,
            format: wNumb({
                decimals: 0,
                postfix: "%"
            })
        }
    });

    slider.noUiSlider.on('set', function(e) {
       let sliderVal = (slider.noUiSlider.get()/100);
       let newRed = Math.floor(currentColors.red * sliderVal);
       let newGreen = Math.floor(currentColors.green * sliderVal);
       let newBlue = Math.floor(currentColors.blue * sliderVal);
       rgbBrightnessChange = true;
       pickr.setColor(`rgb(${newRed}, ${newGreen}, ${newBlue})`);
    });

    function sendData(e){
        let obj = e.toRGBA();
        let red = Math.floor(obj[0]);
        let green = Math.floor(obj[1]);
        let blue = Math.floor(obj[2]);
        let queryBuilder = `red=${red}&green=${green}&blue=${blue}`;

        $.ajax({
            url: `${config.url}/api/lr/?${queryBuilder}&${cacheBuster}`,
            method: 'GET',
            dataType: 'json',
            cache: false,
            success: function (result) {
                // console.log(result);
                // console.log(currentColors);
            }
        });
    }

    function changeWhiteLed(frequency){
        $.ajax({
            url: `${config.url}/api/lr/white?white=${frequency}&${cacheBuster}`,
            method: 'GET',
            success: function(result) {
                console.log(result);
            }
        });
    }

    noUiSlider.create(wSlider, {
        behavior: "tap",
        start: [100],
        connect: [false, true],
        step: 5,
        range: {
            'min': [0],
            'max': [100]
        },
        pips: {
            mode: 'values',
            values: [0, 25, 50, 75, 100],
            density: 5,
            format: wNumb({
                decimals: 0,
                postfix: "%"
            })
        }
    });

    wSlider.noUiSlider.on('change', function(e) {
       let sliderVal = (wSlider.noUiSlider.get()/100);
       changeWhiteLed(Math.floor(sliderVal * 255));
    });

    // Get RGB Status so Color Picker in UI is set to that color on page load
    function getLEDStatus(color) {
        $.ajax({
            url: `${config.url}/api/lr/getStatus?colors=${color}&${cacheBuster}`,
            method: 'GET',
            success: function(result) {
                if(color == 'rgb') {
                    let colors = `rgb(${result.red}, ${result.green}, ${result.blue})`;
                    currentColors.red = result.red;
                    currentColors.green = result.green;
                    currentColors.blue = result.blue;
                    pickr.setColor(colors);
                } else {
                    wSlider.noUiSlider.set(Math.floor((result.white / 255) * 100));
                }
            },
        });
    }

    if(config.multi) {
        $("#multi").show();
    }
    $.ajax({
        url: config.kitchenRight + '/kitchenLights/led/status.txt?' + cacheBuster, //kitchen right
        method: 'GET',
        dataType: 'text',
        cache: false,
        success: function (result) {
            globalStatus = result;
            btnStatus();
            if(config.multi) {
                singleButton('Right', result);
            }
        }
    });

    if(config.multi) {
        $.ajax({
            url: config.kitchenLeft + '/kitchenLights/led/status.txt?' + cacheBuster, //kitchen right
            method: 'GET',
            dataType: 'text',
            cache: false,
            success: function (result) {
                singleButton('Left', result);
            }
        });
    }

    $('#btnToggle').on('click', function(e){
        let state;
        if(globalStatus == 0) {
            state = 'on';
            globalStatus = 1;
        } else {
            state = 'off';
            globalStatus = 0;
        }

        //right
        $.ajax({
            url: config.kitchenRight + '/api/kitchen?status=' + state,
            method: 'GET',
            success: function(result) {
                if(config.multi) {
                    singleButton('Right', globalStatus);
                }
            },
            complete: btnStatus
        });

        if(config.multi) {
            //left
            $.ajax({
                url: config.kitchenLeft + '/api/kitchen?status=' + state, //kitchen right
                method: 'GET',
                dataType: 'text',
                success: function (result) {
                    singleButton('Left', globalStatus);
                }
            });
        }
        e.preventDefault();
    });

    // Main big button - uses kitchenRight for master data.
    function btnStatus() {
        if(globalStatus == 0) {
            $('#btnToggle').text('Turn On');
            $('#btnToggle').removeClass().addClass('btn btn-block btn-dark');
            if(config.multi) {
                singleButton('Left', 0);
                singleButton('Right', 0);
            }
        } else {
            $('#btnToggle').text('Turn Off')
            $('#btnToggle').removeClass().addClass('btn btn-block btn-light');
            if(config.multi) {
                singleButton('Left', 1);
                singleButton('Right', 1);
            }
        }
    }

    if(config.multi) {
        $('.single').on('click', function (e) {
            let side;
            let url;
            if($(e.target).data('side') == 'Left') {
                side = 'Left';
                url = config.kitchenLeft;
            } else {
                side = 'Right';
                url = config.kitchenRight;
            }
            $.ajax({
                url: url + '/api/kitchen/toggle?' + cacheBuster, //kitchen right
                method: 'GET',
                dataType: 'json',
                cache: false,
                success: function (result) {
                    singleButton(side, result.status);
                }
            });
            e.preventDefault();
        });

        function singleButton(side, state) {
            if (state == "0") {
                $('#kitchen' + side).text(side + ' On');
                $('#kitchen' + side).removeClass().addClass('btn btn-block btn-dark');
            } else {
                $('#kitchen' + side).text(side + ' Off');
                $('#kitchen' + side).removeClass().addClass('btn btn-block btn-light');
            }
        }
    }
});