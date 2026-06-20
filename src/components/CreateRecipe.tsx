import { useState } from 'react';
import { useStore } from '../state/store';
import { usePalette } from '../hooks';
import { Modal } from './Modal';

export function CreateRecipe() {
  const { state, actions } = useStore();
  const p = usePalette();
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const draft = state.draft;
  if (!draft) return null;

  const editing = !!state.editingRecipeId;

  const inputStyle = {
    borderRadius: 12,
    border: `1px solid ${p.border}`,
    background: p.card,
    fontSize: 15,
    outline: 'none',
    color: p.text,
  } as const;

  return (
    <Modal onClose={actions.closeCreate} width={560} labelledBy="create-title">
      <div
        style={{
          padding: '22px 24px',
          borderBottom: `1px solid ${p.borderSoft}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          background: p.card,
          zIndex: 2,
        }}
      >
        <div
          id="create-title"
          style={{
            fontFamily: "'Bricolage Grotesque', sans-serif",
            fontWeight: 700,
            fontSize: 21,
            letterSpacing: '-0.02em',
          }}
        >
          {editing ? 'Edit recipe' : 'New recipe'}
        </div>
        <button
          onClick={actions.closeCreate}
          aria-label="Close"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            border: 'none',
            background: p.surfaceAlt,
            fontSize: 20,
            cursor: 'pointer',
            lineHeight: 1,
            color: p.text,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '22px 24px 24px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            value={draft.emoji}
            onChange={(e) => actions.draftSet('emoji', e.target.value)}
            maxLength={2}
            aria-label="Recipe emoji"
            style={{
              ...inputStyle,
              width: 62,
              flex: 'none',
              textAlign: 'center',
              fontSize: 26,
              padding: 10,
              background: p.surfaceSunk,
            }}
          />
          <input
            value={draft.name}
            onChange={(e) => actions.draftSet('name', e.target.value)}
            placeholder="Recipe name"
            aria-label="Recipe name"
            style={{
              ...inputStyle,
              flex: 1,
              padding: '12px 14px',
              fontSize: 16,
              fontWeight: 600,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle(p)}>Servings</label>
            <input
              value={draft.servings}
              onChange={(e) => actions.draftSet('servings', e.target.value)}
              type="number"
              min={1}
              aria-label="Servings"
              style={{
                ...inputStyle,
                width: '100%',
                padding: '11px 13px',
                borderRadius: 11,
              }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label style={labelStyle(p)}>Time</label>
            <input
              value={draft.time}
              onChange={(e) => actions.draftSet('time', e.target.value)}
              placeholder="e.g. 30 min"
              aria-label="Time"
              style={{
                ...inputStyle,
                width: '100%',
                padding: '11px 13px',
                borderRadius: 11,
              }}
            />
          </div>
        </div>

        <h3 style={{ margin: '0 0 11px', fontSize: 15, fontWeight: 800 }}>
          Ingredients
        </h3>
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 11 }}
        >
          {draft.ingredients.map((ing, i) => (
            <div key={i} style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
              <input
                value={ing.qty}
                onChange={(e) => actions.draftIng(i, 'qty', e.target.value)}
                placeholder="1"
                aria-label="Quantity"
                style={{
                  ...inputStyle,
                  width: 52,
                  flex: 'none',
                  padding: '10px 8px',
                  borderRadius: 10,
                  fontSize: 14,
                  textAlign: 'center',
                }}
              />
              <input
                value={ing.unit}
                onChange={(e) => actions.draftIng(i, 'unit', e.target.value)}
                placeholder="unit"
                aria-label="Unit"
                style={{
                  ...inputStyle,
                  width: 66,
                  flex: 'none',
                  padding: '10px 8px',
                  borderRadius: 10,
                  fontSize: 14,
                  textAlign: 'center',
                }}
              />
              <input
                value={ing.name}
                onChange={(e) => actions.draftIng(i, 'name', e.target.value)}
                placeholder="ingredient"
                aria-label="Ingredient name"
                style={{
                  ...inputStyle,
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  fontSize: 14,
                }}
              />
              <button
                onClick={() => actions.draftRemoveIng(i)}
                aria-label="Remove ingredient"
                style={{
                  width: 34,
                  height: 34,
                  flex: 'none',
                  border: 'none',
                  background: p.surfaceAlt,
                  borderRadius: 10,
                  color: p.textFaint,
                  fontSize: 18,
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: pasteOpen ? 11 : 22 }}>
          <button
            onClick={actions.draftAddIng}
            style={{
              padding: '9px 14px',
              borderRadius: 10,
              border: `1px dashed ${p.border}`,
              background: p.surfaceSunk,
              color: p.textMuted,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            ＋ Add ingredient
          </button>
          <button
            onClick={() => setPasteOpen((o) => !o)}
            aria-expanded={pasteOpen}
            style={{
              padding: '9px 14px',
              borderRadius: 10,
              border: `1px dashed ${p.border}`,
              background: p.surfaceSunk,
              color: p.textMuted,
              fontWeight: 700,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
          >
            📋 Paste a list
          </button>
        </div>
        {pasteOpen && (
          <div style={{ marginBottom: 22 }}>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={
                'Paste ingredients, one per line…\n2 cups flour\n1 tsp salt\n3 eggs'
              }
              aria-label="Paste ingredients"
              style={{
                ...inputStyle,
                width: '100%',
                minHeight: 96,
                padding: '12px 14px',
                fontSize: 14,
                lineHeight: 1.5,
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => {
                actions.draftPasteIngredients(pasteText);
                setPasteText('');
                setPasteOpen(false);
              }}
              className="pr-press"
              style={{
                marginTop: 8,
                padding: '9px 16px',
                borderRadius: 10,
                border: 'none',
                background: p.accent,
                color: '#fff',
                fontWeight: 700,
                fontSize: 13.5,
                cursor: 'pointer',
              }}
            >
              Add these
            </button>
          </div>
        )}

        <h3 style={{ margin: '0 0 11px', fontSize: 15, fontWeight: 800 }}>Method</h3>
        <textarea
          value={draft.stepsText}
          onChange={(e) => actions.draftSet('stepsText', e.target.value)}
          placeholder="One step per line…"
          aria-label="Method"
          style={{
            ...inputStyle,
            width: '100%',
            minHeight: 120,
            padding: '13px 15px',
            fontSize: 14.5,
            lineHeight: 1.5,
            resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button
            onClick={actions.closeCreate}
            style={{
              flex: 'none',
              padding: '14px 20px',
              borderRadius: 13,
              border: `1px solid ${p.border}`,
              background: p.card,
              color: p.text,
              fontWeight: 700,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={actions.saveRecipe}
            className="pr-press"
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 13,
              border: 'none',
              background: p.accent,
              color: '#fff',
              fontWeight: 800,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            {editing ? 'Save changes' : 'Save recipe'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function labelStyle(p: ReturnType<typeof usePalette>) {
  return {
    fontSize: 12,
    fontWeight: 700,
    color: p.textMuted,
    display: 'block',
    marginBottom: 5,
  } as const;
}
