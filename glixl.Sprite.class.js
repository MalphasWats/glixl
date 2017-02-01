var glixl = (function(glixl)
{
    glixl.Sprite = function Sprite(parameters)
    {
        this.x = parameters.x || 0;
        this.y = parameters.y || 0;
        this.z = parameters.z || 0;
        
        this.width = parameters.width || 16;
        this.height = parameters.height || 16;
        
        this.speed = parameters.speed || 64;//32;
        
        this.angle = parameters.angle || 0;
        this.scale = parameters.scale || 1;
        
        this.frame = parameters.frame || 0;
        
        this.animations = { idle: { frames: [this.frame], frame_duration: 1000, frame_index: 0} };
        this.current_animation = this.animations['idle'];
        this.animation_timer = (new Date()).getTime();
        
        this.destination = false;
        this.path = [];
        this.move_timer = (new Date()).getTime();
        this.move_remainder = {x: 0, y: 0};
    }
    
    glixl.Sprite.prototype.update = function()
    {
        var now = (new Date()).getTime();
        var delta = now - this.animation_timer;

        if(delta > this.current_animation.frame_duration)
        {
            this.animation_timer = now;
            
            this.current_animation.frame_index += 1;
            if (this.current_animation.frame_index >= this.current_animation.frames.length)
                this.current_animation.frame_index = 0;
            this.frame = this.current_animation.frames[this.current_animation.frame_index];
        }
        
        if (this.destination)
        {   
            delta = now - this.move_timer;
            
            var step = this.speed / 1000 * delta + this.move_remainder.x;
            if (step >= 1.0)
            {
                
                var fl_step = Math.floor(step);
                this.move_remainder.x = step - fl_step;
                var dx = this.x - this.destination.x;
                if (Math.abs(dx) < step)
                    fl_step = 1
                    
                if (dx != 0)
                {
                    this.x -= Math.floor(fl_step / 1 * (dx / Math.abs(dx)));
                    this.move_timer = now;
                }
            }
            
            step = this.speed / 1000 * delta + this.move_remainder.y
            if (step >= 1.0)
            {
                var fl_step = Math.floor(step);
                this.move_remainder.y = step - fl_step;
                var dy = this.y - this.destination.y;
                if (Math.abs(dy) < step)
                    fl_step = 1
                    
                if (dy != 0)
                {
                    this.y -= Math.floor(fl_step / 1 * (dy / Math.abs(dy)));
                    this.move_timer = now;
                }
            }
            
            // TODO: This messes up on the bottom row :(
            if (this.x == this.destination.x && this.y == this.destination.y)
            {
                if (this.path.length > 0)
                    this.destination = this.path.shift();
                else
                    this.destination = false;
            }
        }
    }
    
    glixl.Sprite.prototype.add_animation = function(name, frames, frame_duration)
    {
        this.animations[name] = { frames: frames, frame_duration: frame_duration, frame_index:0 };
    }
    
    glixl.Sprite.prototype.set_animation = function(name)
    {
        this.current_animation = this.animations[name];
        
        this.frame = this.current_animation.frames[this.current_animation.frame_index];
    }
    
    glixl.Sprite.prototype.use = function()
    {
        
    }
    
    return glixl;
    
})(glixl || {});