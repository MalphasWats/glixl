var glixl = (function(glixl)
{
    glixl.Light = function Light(parameters)
    {
        this.x = parameters.x || 0;
        this.y = parameters.y || 0;
        
        this.radius = parameters.radius || 100;
        
        this.colour = parameters.colour || [1.0, 1.0, 1.0];
    }
    
    glixl.Light.prototype.update = function()
    {
        
    }
    
    return glixl;
    
})(glixl || {});