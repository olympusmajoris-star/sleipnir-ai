"""Compile the deployed render shaders in a headless EGL ES3 context."""
import ctypes as C
import json
import pathlib
import subprocess

root = pathlib.Path(__file__).resolve().parent.parent
source = r"""
const fs=require('fs'),vm=require('vm');const w={};const c=vm.createContext({window:w});
for(const file of ['bh-engine.js','reference-hole.js','reference-variants.js']){
 let code=fs.readFileSync(file,'utf8');if(file==='bh-engine.js')code=code.replace('G.BH = {','G.__bhShaders={VS,FS}; G.BH = {');vm.runInContext(code,c);
}
process.stdout.write(JSON.stringify([['Black holes',w.__bhShaders],['Reference',w.AsgardReference],['Variants',w.AsgardVariants]].map(([name,s])=>({name,vs:s.VS,fs:s.FS}))));
"""
shaders = json.loads(subprocess.check_output(['node', '-e', source], cwd=root))
egl = C.CDLL('libEGL.so.1')
def api(name, result, *args):
    fn = getattr(egl, name); fn.restype = result; fn.argtypes = args; return fn
ptr, integer = C.c_void_p, C.c_int
get_proc = api('eglGetProcAddress', ptr, C.c_char_p)
platform = C.CFUNCTYPE(ptr, C.c_uint, ptr, C.POINTER(integer))(get_proc(b'eglGetPlatformDisplayEXT'))
display = platform(0x31DD, None, None)
major, minor = integer(), integer()
assert api('eglInitialize', C.c_uint, ptr, C.POINTER(integer), C.POINTER(integer))(display, C.byref(major), C.byref(minor)), 'EGL initialization failed'
assert api('eglBindAPI', C.c_uint, C.c_uint)(0x30A0)
config, count = ptr(), integer()
attrs = (integer * 11)(0x3033, 1, 0x3040, 0x40, 0x3024, 8, 0x3023, 8, 0x3022, 8, 0x3038)
assert api('eglChooseConfig', C.c_uint, ptr, C.POINTER(integer), C.POINTER(ptr), integer, C.POINTER(integer))(display, attrs, C.byref(config), 1, C.byref(count)) and count.value
surface = api('eglCreatePbufferSurface', ptr, ptr, ptr, C.POINTER(integer))(display, config, (integer * 5)(0x3057, 64, 0x3056, 64, 0x3038))
context = api('eglCreateContext', ptr, ptr, ptr, ptr, C.POINTER(integer))(display, config, None, (integer * 3)(0x3098, 3, 0x3038))
assert context and api('eglMakeCurrent', C.c_uint, ptr, ptr, ptr, ptr)(display, surface, surface, context)
def gl(name, result, *args):
    address = get_proc(name.encode()); assert address, name
    return C.CFUNCTYPE(result, *args)(address)
create_shader = gl('glCreateShader', C.c_uint, C.c_uint)
shader_source = gl('glShaderSource', None, C.c_uint, integer, C.POINTER(C.c_char_p), C.POINTER(integer))
compile_shader = gl('glCompileShader', None, C.c_uint)
shader_iv = gl('glGetShaderiv', None, C.c_uint, C.c_uint, C.POINTER(integer))
shader_log = gl('glGetShaderInfoLog', None, C.c_uint, integer, C.POINTER(integer), C.c_char_p)
create_program = gl('glCreateProgram', C.c_uint)
attach = gl('glAttachShader', None, C.c_uint, C.c_uint)
link = gl('glLinkProgram', None, C.c_uint)
program_iv = gl('glGetProgramiv', None, C.c_uint, C.c_uint, C.POINTER(integer))
program_log = gl('glGetProgramInfoLog', None, C.c_uint, integer, C.POINTER(integer), C.c_char_p)
print(gl('glGetString', C.c_char_p, C.c_uint)(0x1F02).decode())
for item in shaders:
    program = create_program()
    for kind, key in [(0x8B31, 'vs'), (0x8B30, 'fs')]:
        shader = create_shader(kind); text = C.c_char_p(item[key].encode())
        shader_source(shader, 1, C.byref(text), None); compile_shader(shader)
        ok = integer(); shader_iv(shader, 0x8B81, C.byref(ok))
        if not ok.value:
            message = C.create_string_buffer(16000); shader_log(shader, len(message), None, message)
            raise AssertionError(item['name'] + ' ' + key + ': ' + message.value.decode())
        attach(program, shader)
    link(program); ok = integer(); program_iv(program, 0x8B82, C.byref(ok))
    if not ok.value:
        message = C.create_string_buffer(16000); program_log(program, len(message), None, message)
        raise AssertionError(item['name'] + ': ' + message.value.decode())
    print(item['name'] + ': compiled and linked')
