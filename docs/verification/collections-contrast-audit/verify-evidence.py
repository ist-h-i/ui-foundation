import json, hashlib, subprocess, datetime
from pathlib import Path

out=Path('/tmp/ui-foundation-collections-contrast-audit')
r=json.loads((out/'contrast-browser-results.json').read_text())
b=json.loads((out/'build-run.json').read_text())
run=json.loads((out/'browser-run.json').read_text())
hist=json.loads((out/'source-and-token-history.json').read_text())
checks=[]
def check(name,value,detail=None):
    checks.append({'name':name,'passed':bool(value),'details':detail})
    assert value,(name,detail)
def luminance(rgb):
    c=[v/255 for v in rgb]
    c=[v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4 for v in c]
    return sum(w*v for w,v in zip([.2126,.7152,.0722],c))
def ratio(a,b):
    aa,bb=luminance(a),luminance(b)
    return (max(aa,bb)+.05)/(min(aa,bb)+.05)
check('exact merged source and420 original tracked blobs',r['sourceHead']=='8d01adc6497addd97428507a0d3239dbe093a6a9' and hist['all420TrackedSnapshotFilesUnchangedAfterSyncBuild'])
check('five original generator/AOT/linker/CSS commands exited0',b['completedCommands']==5 and b['actualExitCode']==0 and all(c['actualExitCode']==0 and Path(c['log']).is_file() and hashlib.sha256(Path(c['log']).read_bytes()).hexdigest()==c['logSha256'] for c in b['commands']))
check('native browser original process exited0 and log hash matches',run['actualExitCode']==r['actualExitCode']==0 and (out/'browser-run.exit').read_text().strip()=='0' and hashlib.sha256(Path(run['log']).read_bytes()).hexdigest()==run['logSha256'])
check('all original24 selectors reproduce actual axe uncertainty',len(r['occurrences'])==24 and all(o['freshAxeIncompleteMatched'] and 'partially obscured' in o['freshAxeSummary'] for o in r['occurrences']))
check('all original24 are entirely outside virtualviewportclip, not partlypainted text',all(o['nodeMeasurement']['classification']=='outside-virtual-viewport-buffer' and o['nodeMeasurement']['viewportPaintedArea']==0 and o['nodeMeasurement']['visibilityFraction']==0 and o['nodeMeasurement']['actualPNG']['exactForegroundPixels']==0 for o in r['occurrences']))
originalStates=[s for s in r['states'] if s['name'] in ['narrow-listbox','invalid-preserved-cva']]
check('same original conditions320/900/200percent/RTL/reducedmotion/End1000 in both profiles',len(originalStates)==4 and all(s['page']['width']==320 and s['page']['height']==900 and s['page']['font']=='32px' and s['page']['dir']=='rtl' and s['page']['reducedMotion']=='reduce' and s['host']['activeLabel']=='候補1000' for s in originalStates))
check('normal and restored-invalid models retain exact original values',all(json.loads(s['model'])==(['option0001','option0700'] if s['name']=='narrow-listbox' else ['gone','gone']) for s in originalStates))
full=[s for s in r['states'] if s['name'].startswith('fully-visible')]
check('all36 target measurements are fullyvisible with opaque/complete compositing and4.5minimum',len(full)==6 and all(n['visibilityFraction']>.999 and n['contrast']['completeAlphaModelForObservedStyles'] and n['contrast']['meetsMinimum'] and n['contrast']['foregroundRGBA'][3]==1 for s in full for n in s['nodes']))
check('independent Python WCAG luminance reproduces every computed ratio',all(abs(ratio(n['contrast']['effectiveForegroundRGB'],n['contrast']['effectiveBackgroundRGB'])-n['contrast']['ratio'])<1e-12 for s in r['states'] for n in s['nodes']))
check('all fullyvisible foreground and background colors really occur in uneditedPNG',all(n['actualPNG']['exactForegroundPixels']>0 and n['actualPNG']['exactBackgroundPixels']>0 and any(p['hitOwn'] and p['pixelRGBA'][:3]==[round(x) for x in n['contrast']['effectiveBackgroundRGB']] for p in n['samplePoints']) for s in full for n in s['nodes']))
check('all36 fullyvisible target nodes are axe color-contrast passes',all(any(n['nodeId'] in str(p['target']) and ((n['kind']=='group')==('.ui-listbox-group' in str(p['target']))) for p in s['axe']['passesColorContrast']['nodes']) for s in full for n in s['nodes']))
check('nativeAX has one listbox and correct option names/group parents',all(len(s['AX']['listboxes'])==1 and len(s['AX']['rows'])==3 and all(a['role']=='option' and a['name']=='候補'+a['value'][-4:] and a['parent']['role']=='group' and a['parent']['name']=='後半の候補' for a in s['AX']['rows']) for s in r['states']))
check('nativeAX selected values match the retained CVA model',all(next(p['value']['value'] for p in a['properties'] if p['name']=='selected')==(a['value'] in json.loads(s['model'])) for s in r['states'] for a in s['AX']['rows']))
check('invalidSpace does not replace gone/gone and host retains invalid/focus',all(json.loads(s['model'])==['gone','gone'] and s['host']['invalid']=='true' and s['host']['focused'] for s in full if s['name']=='fully-visible-invalid'))
partial=[s for s in r['states'] if s['name']=='native-wheel-partial-clip']
check('nativewheel distinguishes partialrow from zero-paint buffers',len(partial)==2 and all(any(n['kind']=='group' and n['value']=='option0994' and n['visibilityFraction']==0 for n in s['nodes']) and any(n['kind']=='label' and n['value']=='option0994' and .9<n['visibilityFraction']<1 and n['actualPNG']['exactForegroundPixels']>0 for n in s['nodes']) for s in partial))
check('12 complete raw axe states keep zero violations and90 current incomplete occurrences',len(r['states'])==12 and sum(len(s['axe']['violations']) for s in r['states'])==0 and sum(len(rule['nodes']) for s in r['states'] for rule in s['axe']['incomplete'] if rule['id']=='color-contrast')==90)
check('original source/proof/assets hash preserved',r['assets']==json.loads((out/'snapshot-main-8d01adc/docs/verification/ui-library-collections-2026-10-06.json').read_text())['drawing']['provenance']['assets'])
check('all12 nativePNG hashes still match original captures',len(r['pictures'])==12 and all(hashlib.sha256(Path(i['path']).read_bytes()).hexdigest()==i['sha256'] for i in r['pictures']))
check('new renderer classification and existing color token classification evidence retained',not hist['templatePresenceAndHashes'][0]['listboxTemplatePresent'] and hist['tokenHistory']['allColorTokenLinesUnchanged'] and hist['tokenHistory']['configDeltaOnlyCollectionDimensions'])
check('own browser/server close completed',r['ownBrowserAndServerClosed'])
listener=subprocess.run(['/usr/sbin/lsof','-nP','-iTCP:5335','-sTCP:LISTEN'],capture_output=True,text=True)
check('readonlylsof confirms no listener on owned5335 afterrun',listener.returncode==1 and not listener.stdout and not listener.stderr,{'command':['/usr/sbin/lsof','-nP','-iTCP:5335','-sTCP:LISTEN'],'actualExitCode':listener.returncode,'stdout':listener.stdout,'stderr':listener.stderr,'meaning':'exit1 means no matching listener'})
result={'actualExitCode':0,'checkedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'checks':checks,'count':len(checks),'minimumContrast':min(n['contrast']['ratio'] for s in full for n in s['nodes'])}
(out/'verification-checks.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'actualExitCode':0,'checksPassed':len(checks),'minRatio':result['minimumContrast']}))
