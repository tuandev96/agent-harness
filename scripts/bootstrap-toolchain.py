#!/usr/bin/env python3
"""Install only three pinned build dependencies, without package lifecycle scripts.
Default is a dry-run. npm ci remains the normal route; this is an explicit fallback.
"""
import argparse, base64, hashlib, io, json, os, subprocess, tarfile, tempfile
from pathlib import Path, PurePosixPath
ROOT = Path(__file__).resolve().parent.parent
PACKAGES = [
 ('typescript','5.9.3','typescript/-/typescript-5.9.3.tgz','jl1vZzPDinLr9eUt3J/t7V6FgNEw9QjvBPdysz9KfQDD41fQrC2Y4vKQdiaUpFT4bXlb1RHhLpp8wtm6M5TgSw=='),
 ('@types/node','24.3.0','@types/node/-/node-24.3.0.tgz','aPTXCrfwnDLj4VvXrm+UUCQjNEvJgNA8s5F1cvwQU+3KNltTOkBm1j30uNLyqqPNe7gE3KFzImYoZEfLhp4Yow=='),
 ('undici-types','7.10.0','undici-types/-/undici-types-7.10.0.tgz','t5Fy/nfn+14LuOc2KNYg75vZqClpAiqscVvMygNnlsHBFpSXdJaYtXMcdNLpl/Qvc3P2cB3s6lOV51nqsFq4ag=='),
]
def main():
    args=argparse.ArgumentParser();args.add_argument('--apply',action='store_true');args=args.parse_args()
    if not args.apply:
        print('DRY_RUN:', ', '.join(n+'@'+v for n,v,_,_ in PACKAGES));return
    base=ROOT/'node_modules'
    if base.is_symlink(): raise RuntimeError('node_modules must not be a symlink')
    base.mkdir(exist_ok=True)
    package=json.loads((ROOT/'package.json').read_text())
    lock={'name':package['name'],'version':package['version'],'lockfileVersion':3,'requires':True,'packages':{'':{k:package[k] for k in ['name','version','engines','devDependencies','bin']}}}
    for name,version,path,integrity in PACKAGES:
        destination=base/name
        for ancestor in destination.parents:
            if ancestor==ROOT:break
            if ancestor.is_symlink():raise RuntimeError('dependency parent symlink')
        url='https://registry.npmjs.org/'+path
        data=subprocess.run(['curl','--fail','--silent','--show-error','--connect-timeout','5','--max-time','20',url],capture_output=True,check=True,timeout=25).stdout
        if base64.b64encode(hashlib.sha512(data).digest()).decode()!=integrity:raise RuntimeError('integrity mismatch: '+name)
        destination.parent.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='.toolchain-',dir=base) as tmp:
            tmp=Path(tmp);total=0;seen=set()
            with tarfile.open(fileobj=io.BytesIO(data),mode='r:gz') as archive:
                for entry in archive:
                    parts=PurePosixPath(entry.name).parts
                    if not parts or entry.name.startswith('/') or '..' in parts or '\\' in entry.name:raise RuntimeError('unsafe archive path')
                    if entry.isdir():continue
                    if not entry.isfile() or len(parts)<2:raise RuntimeError('non-regular archive entry')
                    relative=Path(*parts[1:]);total+=entry.size
                    if str(relative) in seen or total>64*1024*1024:raise RuntimeError('duplicate or oversized archive')
                    seen.add(str(relative));target=tmp/relative;target.parent.mkdir(parents=True,exist_ok=True)
                    content=archive.extractfile(entry).read();target.write_bytes(content)
            metadata=json.loads((tmp/'package.json').read_text())
            if metadata['name']!=name or metadata['version']!=version:raise RuntimeError('package identity mismatch')
            if destination.exists():
                old=json.loads((destination/'package.json').read_text())
                if old['version']!=version:raise RuntimeError('refusing to replace an existing different package')
            else:os.rename(tmp,destination)
        row={'version':version,'resolved':url,'integrity':'sha512-'+integrity,'dev':True,'license':metadata.get('license','UNKNOWN')}
        for field in ['dependencies','bin','engines']:
            if metadata.get(field):row[field]=metadata[field]
        lock['packages']['node_modules/'+name]=row
        print('VERIFIED_INSTALLED',name,version)
    (ROOT/'package-lock.json').write_text(json.dumps(lock,indent=2)+'\n')
if __name__=='__main__':main()
