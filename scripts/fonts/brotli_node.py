# Minimal stand-in for the "brotli" Python package, backed by Node's built-in zlib (no PyPI here).
import subprocess
MODE_GENERIC, MODE_TEXT, MODE_FONT = 0, 1, 2
error = Exception
_C = ("const z=require('zlib');const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{const b=Buffer.concat(c);"
      "process.stdout.write(z.brotliCompressSync(b,{params:{[z.constants.BROTLI_PARAM_MODE]:%d,[z.constants.BROTLI_PARAM_QUALITY]:%d,[z.constants.BROTLI_PARAM_LGWIN]:%d,[z.constants.BROTLI_PARAM_SIZE_HINT]:b.length}}))})")
_D = "const z=require('zlib');const c=[];process.stdin.on('data',d=>c.push(d));process.stdin.on('end',()=>{process.stdout.write(z.brotliDecompressSync(Buffer.concat(c)))})"
def compress(data, mode=MODE_GENERIC, quality=11, lgwin=22, lgblock=0):
    return subprocess.run(['node', '-e', _C % (mode, quality, lgwin)], input=bytes(data), capture_output=True, check=True).stdout
def decompress(data):
    return subprocess.run(['node', '-e', _D], input=bytes(data), capture_output=True, check=True).stdout
