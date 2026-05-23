"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelSubscription, getPaymentPlans, getSubscriptionStatus } from "@/lib/api/payments.api";
import { useAuthStore } from "@/lib/store/authStore";

export function useSubscription() {
  const token = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const subscriptionQuery = useQuery({
    queryKey: ["subscription", token],
    queryFn: async () => {
      if (!token) return null;
      return getSubscriptionStatus(token);
    },
    enabled: Boolean(token),
    retry: false,
  });

  const plansQuery = useQuery({
    queryKey: ["payment-plans", token],
    queryFn: async () => {
      if (!token) return [];
      return getPaymentPlans(token);
    },
    enabled: Boolean(token),
    retry: false,
  });

  const cancelMutation = useMutation({
    mutationFn: async (reason?: string) => {
      if (!token) {
        throw new Error("Missing auth token");
      }
      return cancelSubscription(token, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
    },
  });

  return {
    subscription: subscriptionQuery.data,
    plans: plansQuery.data ?? [],
    isLoading: subscriptionQuery.isLoading || plansQuery.isLoading,
    isPremium: Boolean(subscriptionQuery.data?.is_premium),
    refresh: async () => {
      await Promise.all([subscriptionQuery.refetch(), plansQuery.refetch()]);
    },
    cancelSubscription: cancelMutation.mutateAsync,
    cancelling: cancelMutation.isPending,
  };
}
