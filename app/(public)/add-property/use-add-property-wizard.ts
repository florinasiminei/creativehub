'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  findFirstInvalidListingStep,
  validateListingWizardStep,
  type ListingStepValidation,
  type ListingStepValidationInput,
} from '@/lib/listings/listingSubmissionRules';
import { WIZARD_STEPS } from './add-property-model';

type UseAddPropertyWizardOptions = {
  validationInput: ListingStepValidationInput;
  clearFeedback: () => void;
  setError: (message: string) => void;
  onStepChanged?: () => void;
};

export default function useAddPropertyWizard({
  validationInput,
  clearFeedback,
  setError,
  onStepChanged,
}: UseAddPropertyWizardOptions) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [furthestStepIndex, setFurthestStepIndex] = useState(0);
  const [showValidation, setShowValidation] = useState(false);
  const [validationAttempt, setValidationAttempt] = useState(0);

  const activeStep = WIZARD_STEPS[activeStepIndex];
  const currentStepValidation = useMemo(
    () => validateListingWizardStep(activeStep.id, validationInput),
    [activeStep.id, validationInput],
  );

  const showStepError = useCallback((validation: ListingStepValidation) => {
    setShowValidation(true);
    setValidationAttempt((previous) => previous + 1);
    setError(validation.error || 'Verifică informațiile introduse.');
  }, [setError]);

  const moveToStep = useCallback((nextIndex: number) => {
    const boundedIndex = Math.max(0, Math.min(WIZARD_STEPS.length - 1, nextIndex));
    clearFeedback();
    setShowValidation(false);
    setActiveStepIndex(boundedIndex);
    setFurthestStepIndex((previous) => Math.max(previous, boundedIndex));
    onStepChanged?.();
  }, [clearFeedback, onStepChanged]);

  const continueToNextStep = useCallback(() => {
    clearFeedback();
    if (currentStepValidation.error) {
      showStepError(currentStepValidation);
      return false;
    }
    moveToStep(activeStepIndex + 1);
    return true;
  }, [activeStepIndex, clearFeedback, currentStepValidation, moveToStep, showStepError]);

  const selectStep = useCallback((nextIndex: number) => {
    if (nextIndex > activeStepIndex) {
      for (let stepIndex = activeStepIndex; stepIndex < nextIndex; stepIndex += 1) {
        const validation = validateListingWizardStep(WIZARD_STEPS[stepIndex].id, validationInput);
        if (!validation.error) continue;
        if (stepIndex !== activeStepIndex) moveToStep(stepIndex);
        showStepError(validation);
        return;
      }
    }
    moveToStep(nextIndex);
  }, [activeStepIndex, moveToStep, showStepError, validationInput]);

  const findFirstInvalidStep = useCallback(() => {
    const firstInvalid = findFirstInvalidListingStep(validationInput);
    if (!firstInvalid) return null;
    const stepIndex = WIZARD_STEPS.findIndex((step) => step.id === firstInvalid.step);
    if (stepIndex !== activeStepIndex) moveToStep(stepIndex);
    showStepError(firstInvalid.validation);
    return firstInvalid;
  }, [activeStepIndex, moveToStep, showStepError, validationInput]);

  return {
    activeStep,
    activeStepIndex,
    furthestStepIndex,
    showValidation,
    validationAttempt,
    currentStepValidation,
    moveToStep,
    continueToNextStep,
    selectStep,
    findFirstInvalidStep,
  };
}
