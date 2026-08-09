package com.aistudio.fundtracker.model

import kotlinx.serialization.Serializable

@Serializable
enum class AssetType {
    equity, reit, derivative, commodity, debt, money_market, others, mutual_fund
}

@Serializable
enum class Position {
    long, short
}

@Serializable
data class Holding(
    val id: String,
    val name: String,
    val symbol: String,
    val type: AssetType,
    val quantity: Double,
    val avgPrice: Double,
    val position: Position,
    val isin: String,
    val rating: String,
    val industry: String,
    val weight: Double,
    val ytm: String?,
    val marketValueLakhs: Double,
    val subCategory: String? = null
)
