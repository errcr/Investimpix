import { useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import { db } from './firebase';
import { PORTFOLIOS } from '../types';

// Taxa anual de cada portfólio
const ANNUAL_RATES: Record<string, number> = {
  conservative: 0.105,  // 10.5% a.a.
  moderate: 0.152,      // 15.2% a.a.
  aggressive: 0.284,    // 28.4% a.a.
};

// Converte taxa anual para taxa por segundo (juros compostos contínuos)
function getRatePerMs(annualRate: number): number {
  // (1 + r)^(1/365/24/3600/1000) - 1
  return Math.pow(1 + annualRate, 1 / (365 * 24 * 3600 * 1000)) - 1;
}

export function useYieldCalculator(userId: string | null) {
  useEffect(() => {
    if (!userId) return;

    async function calculateAndApplyYield() {
      try {
        const invRef = collection(db, 'users', userId!, 'investments');
        const snapshot = await getDocs(invRef);

        let totalYield = 0;

        const updates = snapshot.docs.map(async (invDoc) => {
          const inv = invDoc.data();
          if (inv.status !== 'active') return;

          const portfolioId = inv.portfolioId;
          const annualRate = ANNUAL_RATES[portfolioId];
          if (!annualRate) return;

          const investedAt: Date = inv.investedAt?.toDate?.() || new Date(inv.investedAt);
          const lastYieldAt: Date = inv.lastYieldAt?.toDate?.() || investedAt;
          const now = new Date();

          const elapsedMs = now.getTime() - lastYieldAt.getTime();
          if (elapsedMs <= 0) return;

          const ratePerMs = getRatePerMs(annualRate);
          const yieldAmount = inv.currentValue 
            ? inv.currentValue * (Math.pow(1 + annualRate, elapsedMs / (365 * 24 * 3600 * 1000)) - 1)
            : inv.amount * (Math.pow(1 + annualRate, elapsedMs / (365 * 24 * 3600 * 1000)) - 1);

          if (yieldAmount < 0.01) return; // só atualiza se rendeu pelo menos R$ 0,01

          const newCurrentValue = (inv.currentValue || inv.amount) + yieldAmount;
          totalYield += yieldAmount;

          // Atualiza o investimento com o novo valor e timestamp
          await updateDoc(invDoc.ref, {
            currentValue: newCurrentValue,
            lastYieldAt: now,
            totalYield: (inv.totalYield || 0) + yieldAmount,
          });
        });

        await Promise.all(updates);

        // Credita o rendimento no totalInvested do usuário
        if (totalYield >= 0.01) {
          const userRef = doc(db, 'users', userId!);
          await updateDoc(userRef, {
            totalInvested: increment(totalYield),
          });
          console.log(`[YIELD] Credited R$ ${totalYield.toFixed(2)} to user ${userId}`);
        }
      } catch (err) {
        console.error('[YIELD] Error calculating yield:', err);
      }
    }

    // Calcula ao abrir o app
    calculateAndApplyYield();

    // Recalcula a cada 1 minuto
    const interval = setInterval(calculateAndApplyYield, 60 * 1000);
    return () => clearInterval(interval);
  }, [userId]);
}
