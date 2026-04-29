import React from 'react'

const Compose = ({composeForm,renderMediaCard,composerPreviewBlocks}) => {
  return (
    <div style={{display:"absolute",top:0,right:0,bottom:0,left:0,backgroundColor:"rgba(0,0,0,0.5)",zIndex:1000}}>
         <div className="echoid-compose-preview">
        <div className="echoid-section-label">Live preview</div>

        {composeForm.title && <h3>{composeForm.title}</h3>}

        {composerPreviewBlocks.map((block) =>
          block.type === "media" ? (
            <div key={block.key}>{renderMediaCard(block.value)}</div>
          ) : block.value ? (
            <div key={block.key} className="echoid-compose-preview-text">
              {block.value}
            </div>
          ) : null
        )}

        {!composeForm.title && !composeForm.body && (
          <div className="echoid-empty-card">
            Your preview will appear here.
          </div>
        )}
      </div>
      
    </div>
  )
}

export default Compose
