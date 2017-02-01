/* glixl2 */
var glixl = (function(glixl)
{
    glixl.Game = function Game(parameters)
    {
        this.canvas = document.getElementsByTagName('canvas')[0];
        if (!this.canvas)
            throw new Error("*** ERROR: Could not find canvas element");
        
        this.width = this.canvas.clientWidth
        this.height = this.canvas.clientHeight
            
        this.context = this.canvas.getContext("webgl");
        if (!glixl.context)
        {
            this.context = this.canvas.getContext("experimental-webgl");
            if (!this.context)
                throw new Error("*** ERROR: Unable to create webgl context");
        }
        
        var vertex_shader_source = parameters.vertex_shader_source || `
            attribute vec3 a_position;
            uniform mat4 viewport_matrix;
            uniform mat4 projection_matrix;
            
            attribute vec2 a_texCoords;
            varying vec2 v_texCoords;
            varying vec2 v_position;
            
            void main()
            {
                gl_Position = projection_matrix * viewport_matrix  * vec4(a_position, 1);
                
                v_texCoords = a_texCoords;
                v_position = a_position.xy;
            }
        `;
        
        var fragment_shader_source = parameters.fragment_shader_source || `
            precision mediump float;
            uniform sampler2D u_image;
            
            varying vec2 v_texCoords;
            varying vec2 v_position;
            
            uniform float ambient_light;
            
            uniform vec2 light_positions[10];
            uniform vec3 light_colours[10];
            uniform float light_radii[10];
            
            uniform int active_light_count;
            
            void main() 
            { 
                vec4 frag_colour = texture2D(u_image, v_texCoords);
                if (frag_colour.a < 1.0)
                    discard;
                
                float diffuse = 0.0;
                float dist;
                
                vec3 light_colour = vec3(0.0, 0.0, 0.0);
                
                for (int i=0 ; i<10 ; i++)
                {
                    dist = distance(light_positions[i], v_position);
                    
                    if (dist < light_radii[i])
                    {
                        diffuse +=  (1.0 - dist / light_radii[i]);
                        light_colour += light_colours[i] * diffuse;
                    }
                    
                }

                gl_FragColor = vec4(min(frag_colour.rgb * (ambient_light + (light_colour)), frag_colour.rgb), 1.0);
            }
        `;
        
        this.shader_program = this.build_shader_program(vertex_shader_source, fragment_shader_source);
        this.context.useProgram(this.shader_program);
        
        this.context.program = this.shader_program;
        
        this.context.enable ( this.context.DEPTH_TEST );
        
        this.context.clearColor(0, 0, 0, 1);
        
        /*window.addEventListener("keydown", this.handle_key_down);
        window.addEventListener("keyup", this.handle_key_up);
        
        this.keys = {};
        
        this.mouse_x = 0;
        this.mouse_y = 0;
        this.mouse_down = false;
        
        window.addEventListener("mousemove", this.save_mouse_position);
        this.canvas.addEventListener("mousedown", this.handle_mouse_down, false);
        this.canvas.addEventListener("mouseup", this.handle_mouse_up, false);
        this.canvas.addEventListener("touchstart", this.handle_mouse_down, false);
        this.canvas.addEventListener("touchend", this.handle_mouse_up, false);*/
        
        this.canvas.addEventListener("mouseup", this.handle_mouse_up.bind(this), false);
        
        window.addEventListener("keydown", this.handle_key_down.bind(this), false);
        window.addEventListener("keyup", this.handle_key_up.bind(this), false);
        
        this.keys = {};
        
        this.event_queue = [];
        
        /* TODO: Create a 'loading' scene */

        this.prevTS = 0;
        this.fps_stream = [];
        this.fps = 0;
        
        this.KEYBOARD_MAP = ["","","","CANCEL","","","HELP","","BACK_SPACE","TAB","","","CLEAR",
                           "ENTER","RETURN","","SHIFT","CONTROL","ALT","PAUSE","CAPS_LOCK","KANA",
                           "EISU","JUNJA","FINAL","HANJA","","ESCAPE","CONVERT","NONCONVERT","ACCEPT",
                           "MODECHANGE","SPACE","PAGE_UP","PAGE_DOWN","END","HOME",
                           
                           "LEFT","UP","RIGHT","DOWN",
                           
                           "SELECT","PRINT","EXECUTE","PRINTSCREEN","INSERT","DELETE","",
                           
                           "0","1","2","3","4","5","6","7","8","9",
                           
                           "COLON","SEMICOLON","LESS_THAN","EQUALS","GREATER_THAN","QUESTION_MARK","AT",
                           
                           "A","B","C","D","E","F","G","H","I","J","K","L","M",
                           "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
                           
                           "WIN","","CONTEXT_MENU","","SLEEP",
                           
                           "NUMPAD0","NUMPAD1","NUMPAD2","NUMPAD3","NUMPAD4",
                           "NUMPAD5","NUMPAD6","NUMPAD7","NUMPAD8","NUMPAD9",
                           
                           "MULTIPLY","ADD","SEPARATOR","SUBTRACT","DECIMAL","DIVIDE",
                           
                           "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
                           "F13","F14","F15","F16","F17","F18","F19","F20","F21","F22","F23","F24",
                           
                           "","","","","","","","","NUM_LOCK","SCROLL_LOCK","WIN_OEM_FJ_JISHO",
                           "WIN_OEM_FJ_MASSHOU","WIN_OEM_FJ_TOUROKU","WIN_OEM_FJ_LOYA","WIN_OEM_FJ_ROYA",
                           "","","","","","","","","","CIRCUMFLEX","EXCLAMATION","DOUBLE_QUOTE","HASH",
                           "DOLLAR","PERCENT","AMPERSAND","UNDERSCORE","OPEN_PAREN","CLOSE_PAREN",
                           "ASTERISK","PLUS","PIPE","HYPHEN_MINUS","OPEN_CURLY_BRACKET","CLOSE_CURLY_BRACKET",
                           "TILDE","","","","","VOLUME_MUTE","VOLUME_DOWN","VOLUME_UP","","","SEMICOLON",
                           "EQUALS","COMMA","MINUS","PERIOD","SLASH","BACK_QUOTE",
                           "","","","","","","","","","","","","","","","","","","","","","","","","","",
                           "OPEN_BRACKET","BACK_SLASH","CLOSE_BRACKET","QUOTE","","META","ALTGR","","WIN_ICO_HELP",
                           "WIN_ICO_00","","WIN_ICO_CLEAR","","","WIN_OEM_RESET","WIN_OEM_JUMP","WIN_OEM_PA1",
                           "WIN_OEM_PA2","WIN_OEM_PA3","WIN_OEM_WSCTRL","WIN_OEM_CUSEL","WIN_OEM_ATTN",
                           "WIN_OEM_FINISH","WIN_OEM_COPY","WIN_OEM_AUTO","WIN_OEM_ENLW","WIN_OEM_BACKTAB",
                           "ATTN","CRSEL","EXSEL","EREOF","PLAY","ZOOM","","PA1","WIN_OEM_CLEAR",""];
                           
        this.DEFAULT_KEYS = {
            SPACE: true,
            UP: true,
            DOWN: true,
            LEFT: true,
            RIGHT: true,
        };
    }
    
    glixl.Game.prototype.build_shader_program = function(vertex_shader_source, fragment_shader_source)
    {
        var vertex_shader = this.context.createShader(this.context.VERTEX_SHADER);
        this.context.shaderSource(vertex_shader, vertex_shader_source);
        this.context.compileShader(vertex_shader);

        var compiled = this.context.getShaderParameter(vertex_shader, this.context.COMPILE_STATUS);
        if (!compiled) 
        {
            this.context.deleteShader(vertex_shader);
            var lastError = this.context.getShaderInfoLog(vertex_shader);
            throw new Error("*** Error: Could not compile shader '" + vertex_shader + "' : " + lastError);
        }
        
        var fragment_shader = this.context.createShader(this.context.FRAGMENT_SHADER);
        this.context.shaderSource(fragment_shader, fragment_shader_source);
        this.context.compileShader(fragment_shader);
        
        var compiled = this.context.getShaderParameter(fragment_shader, this.context.COMPILE_STATUS);
        if (!compiled) 
        {
            this.context.deleteShader(fragment_shader);
            var lastError = this.context.getShaderInfoLog(fragment_shader);
            throw new Error("*** Error: Could not compile shader '" + fragment_shader + "' : " + lastError);
        }
        
        var program = this.context.createProgram();
        this.context.attachShader(program, vertex_shader);
        this.context.attachShader(program, fragment_shader);
        
        this.context.linkProgram(program);
        var linked = this.context.getProgramParameter(program, this.context.LINK_STATUS);
        if (!linked) 
        {
            // something went wrong with the link
            this.context.deleteProgram(program);
            var lastError = this.context.getProgramInfoLog(program);
            throw new Error("*** Error: Could not link program: " + lastError);
        }
        
        return program;
    }
    
    glixl.Game.prototype.set_scene = function(scene)
    {
        this.scene = scene;
        this.scene.initialise_viewport({x: 0, y:0, width:this.width, height:this.height});
        
        this.scene.sprite_sheet.bind();
    }
    
    glixl.Game.prototype.start = function()
    {
        console.log('Game Started!');
        /*this.app_loop = function(ts)
        {
            //glixl.update_fps(ts);
            
            //glixl.update();
            //glixl.app.update();
            console.log(this);
            this.scene.draw();
            window.requestAnimationFrame(this.app_loop);
        }*/
        
        window.requestAnimationFrame(this.game_loop.bind(this));
    }
    
    glixl.Game.prototype.game_loop = function(ts)
    {
        this.update();
        this.scene.update();
        this.scene.draw();
        
        for (var i=0 ; i<this.event_queue.length ; i++)
            this.event_queue[i].use();
            
        this.event_queue = [];
        
        var delta = ts - this.prevTS;
        this.prevTS = ts;
        
        this.fps_stream.unshift(1000 / delta);
        this.fps_stream = this.fps_stream.slice(0, 20);
        var sum = 0;
        for (var i=0 ; i<20 ; i++)
            sum += this.fps_stream[i];
            
        this.fps = Math.round(sum/20);
        
        window.requestAnimationFrame(this.game_loop.bind(this));
    }
    
    glixl.Game.prototype.update = function()
    {
        
    }
    
    glixl.Game.prototype.draw = function()
    {
        
    }
    
    glixl.Game.prototype.handle_mouse_up = function(e)
    {
        var mouse_x = (e.pageX - this.canvas.offsetLeft) + this.scene.viewport.x;
        var mouse_y = (e.pageY - this.canvas.offsetTop) + this.scene.viewport.y;
        
        var item = this.scene.get_topmost_item(mouse_x, mouse_y);
        this.event_queue.push(item);
    }
    
    glixl.Game.prototype.handle_key_down = function(e)
    {
        event = (e) ? e : window.event;
        if (this.DEFAULT_KEYS[this.KEYBOARD_MAP[event.keyCode]])
            event.preventDefault();
        
        this.keys[this.KEYBOARD_MAP[event.keyCode]] = true;
    }
        
    glixl.Game.prototype.handle_key_up = function(e)
    {
        event = (e) ? e : window.event;
        event.preventDefault();
        delete this.keys[this.KEYBOARD_MAP[event.keyCode]];
    }
    
    glixl.Game.prototype.key_pressed = function(key)
    {
        if (this.keys[key.toUpperCase()])
            return true;
        return false;
    }
        
    return glixl;
    
})(glixl || {});