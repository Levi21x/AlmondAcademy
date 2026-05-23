from typing import Literal

StudentCategory = Literal[
    "survivor",
    "sprinter",
    "anxious_grinder",
    "passionate",
    "lost",
    "strategic_climber",
]

TeachingStyle = Literal["concise", "detailed", "visual", "conversational"]
StudentMode = Literal["mbbs", "neet_pg", "both"]
SubscriptionPlan = Literal[
    "free",
    "mbbs_premium",
    "neetpg_premium",
    "combined",
    "crisis_pack_mbbs",
    "crisis_pack_neetpg",
]
SubscriptionStatus = Literal["active", "expired", "cancelled"]
