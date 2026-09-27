import fs from 'fs'
import path from 'path'

export default function handler(req,res){
  try{
    const istat = (req.query.istat || req.query.q || '').toString().trim()
    // cerca file top100 in lib/ o src/lib/
    let filePath = path.join(process.cwd(),'lib','top100Comuni.json')
    if(!fs.existsSync(filePath)){
      filePath = path.join(process.cwd(),'src','lib','top100Comuni.json')
    }
    const raw = fs.readFileSync(filePath,'utf8')
    const comuni = JSON.parse(raw)
    const found = comuni.find(c => c.istat === istat || c.codiceIstat === istat || c.COD_ISTAT === istat)
    if(found){
      return res.status(200).json({found:true, comune:found.nome || found.comune || found.denominazione, istat, scadenza:"30/11/2026", riduzione:25, fonte:"Delibera TARI 2026 - Top 100"})
    }
    return res.status(200).json({found:false, istat, message:"Comune fuori Top 100 - in verifica"})
  }catch(e){
    return res.status(500).json({error:e.message, stack:e.stack?.slice(0,300)})
  }
}
